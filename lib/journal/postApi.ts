import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { body, text, flag, choice, date, requireUser, ownProject, ownedImages, JournalError, pageNumber, publicPost, requestId } from './server'
import { postTypes, milestoneTypes, slugify } from './validation'
import { focusStats, weekStart } from './stats'
import { postInclude } from './queries'
export async function postsApi(request: NextRequest, id?: string) {
  const user = await requireUser(request)
  const current = id ? await prisma.journalPost.findFirst({
    where: {
      id,
      authorId: user.id
    },
    include: {
      milestone: true
    }
  }) : null
  if (id && !current) throw new JournalError('Update not found.', 404)
  if (request.method === 'GET') {
    if (current) return NextResponse.json(current)
    const page = pageNumber(request.nextUrl.searchParams.get('page'))
    const posts = await prisma.journalPost.findMany({
      where: {
        authorId: user.id
      },
      include: postInclude,
      orderBy: [{
        createdAt: 'desc'
      }, {
        id: 'desc'
      }],
      take: 21,
      skip: (page - 1) * 20
    })
    return NextResponse.json({
      items: posts.slice(0, 20),
      hasMore: posts.length > 20
    })
  }
  if (request.method === 'DELETE' && id) {
    await prisma.journalPost.delete({
      where: {
        id
      }
    })
    return NextResponse.json({
      success: true
    })
  }
  const data = await body(request)
  const createId = id ? undefined : requestId(data)
  const type = choice(data.type, postTypes, 'UPDATE')
  const projectId = text(data, 'projectId', 100) || null
  const project = projectId ? await ownProject(projectId, user.id) : null
  if (type === 'MILESTONE' && !project) throw new JournalError('Choose a project for this milestone.', 400, 'projectId')
  const title = text(data, 'title', 160, type === 'MILESTONE') || null
  const content = text(data, 'content', 20000, type !== 'MILESTONE')
  const visibility = choice(data.visibility, (['PUBLIC', 'PRIVATE'] as const), 'PRIVATE')
  const published = flag(data, 'published')
  if (published && visibility === 'PUBLIC' && project?.visibility === 'PRIVATE') throw new JournalError('Make the project public before publishing its update.', 400, 'visibility')
  const images = await ownedImages(data.images, user.id)
  const now = new Date()
  const achievedAt = type === 'MILESTONE' ? date(data.achievedAt) : now
  if (project && achievedAt < project.startedAt && type === 'MILESTONE') throw new JournalError('The milestone date must be on or after the project start date.', 400, 'achievedAt')
  const from = type !== 'MILESTONE' ? weekStart(date(data.weekStart, now)) : undefined
  const to = from ? new Date(Math.min(now.getTime(), from.getTime() + 7 * 86400000 - 1)) : new Date(Math.min(now.getTime(), achievedAt.getTime() + 86400000 - 1))
  const showFocusStats = flag(data, 'showFocusStats')
  // Preserve historical snapshots when editing prose; recompute only if the scope changes.
  const sameScope = current && current.type === type && current.projectId === projectId && (current.statsFrom?.getTime() ?? null) === (from?.getTime() ?? null) && (type !== 'MILESTONE' || current.milestone?.achievedAt.getTime() === achievedAt.getTime())
  const stats = sameScope && current.focusedSecondsSnapshot !== null ? {
    seconds: current.focusedSecondsSnapshot,
    sessions: current.sessionsSnapshot ?? 0
  } : await focusStats(user.id, projectId ?? undefined, from, to)
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1::int FROM pg_advisory_xact_lock(hashtext(${user.id}))`
    if (createId) {
      const existing = await tx.journalPost.findFirst({
        where: {
          id: createId,
          authorId: user.id
        }
      })
      if (existing) return existing
    }
    const values = {
      projectId,
      type,
      title,
      content,
      images,
      important: flag(data, 'important'),
      visibility,
      showFocusStats,
      focusedSecondsSnapshot: Math.round(stats.seconds),
      sessionsSnapshot: stats.sessions,
      statsFrom: from ?? null,
      statsTo: sameScope ? current.statsTo : to,
      publishedAt: published ? current?.publishedAt ?? now : null,
      ...(current ? {
        editedAt: now
      } : {})
    }
    const post = current ? await tx.journalPost.update({
      where: {
        id: current.id
      },
      data: values
    }) : await tx.journalPost.create({
      data: {
        ...values,
        id: createId,
        authorId: user.id,
        slug: `${slugify(title || 'update')}-${randomUUID().slice(0, 8)}`
      }
    })
    if (type === 'MILESTONE' && projectId && title) {
      const milestone = {
        projectId,
        title,
        description: content,
        type: choice(data.milestoneType, milestoneTypes, 'CUSTOM'),
        imageUrl: images[0] ?? null,
        achievedAt,
        focusedSecondsSnapshot: Math.round(stats.seconds),
        sessionsSnapshot: stats.sessions
      }
      await tx.projectMilestone.upsert({
        where: {
          postId: post.id
        },
        create: {
          ...milestone,
          postId: post.id
        },
        update: milestone
      })
      if (published) await tx.activityEvent.upsert({
        where: {
          userId_key: {
            userId: user.id,
            key: `MILESTONE:${post.id}`
          }
        },
        create: {
          userId: user.id,
          projectId,
          postId: post.id,
          key: `MILESTONE:${post.id}`,
          type: 'MILESTONE',
          createdAt: achievedAt
        },
        update: {
          projectId,
          createdAt: achievedAt
        }
      })
    } else {
      await tx.projectMilestone.deleteMany({
        where: {
          postId: post.id
        }
      })
      await tx.activityEvent.deleteMany({
        where: {
          postId: post.id
        }
      })
    }
    return post
  })
  return NextResponse.json({
    ...result,
    username: user.username
  })
}
export async function feedApi(request: NextRequest) {
  const user = await requireUser(request)
  const page = pageNumber(request.nextUrl.searchParams.get('page'))
  const posts = await prisma.journalPost.findMany({
    where: {
      ...publicPost,
      author: {
        followers: {
          some: {
            followerId: user.id
          }
        }
      }
    },
    include: postInclude,
    orderBy: [{
      publishedAt: 'desc'
    }, {
      id: 'desc'
    }],
    take: 13,
    skip: (page - 1) * 12
  })
  return NextResponse.json({
    items: posts.slice(0, 12),
    hasMore: posts.length > 12
  })
}
export async function weeklyApi(request: NextRequest) {
  const user = await requireUser(request)
  const projectId = request.nextUrl.searchParams.get('projectId') || undefined
  if (projectId) await ownProject(projectId, user.id)
  const from = request.nextUrl.searchParams.get('period') === 'total' ? undefined : weekStart()
  const at = request.nextUrl.searchParams.get('at')
  const to = at ? new Date(Math.min(Date.now(), date(at).getTime() + 86400000 - 1)) : new Date()
  return NextResponse.json({
    ...(await focusStats(user.id, projectId, from, to)),
    from: from?.toISOString() ?? null,
    to: to.toISOString()
  })
}
