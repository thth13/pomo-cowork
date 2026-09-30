import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { body, text, flag, choice, url, date, requireUser, ownProject, ownedImages, JournalError, pageNumber, requestId } from './server'
import { projectStatuses, slugify } from './validation'
import { focusStats } from './stats'
export async function projectsApi(request: NextRequest, id?: string) {
  const user = await requireUser(request)
  if (request.method === 'GET') {
    if (id) return NextResponse.json({
      ...(await ownProject(id, user.id)),
      stats: await focusStats(user.id, id)
    })
    const page = pageNumber(request.nextUrl.searchParams.get('page'))
    if (request.nextUrl.searchParams.get('picker') === '1') {
      const options = await prisma.project.findMany({
        where: { userId: user.id },
        select: { id: true, name: true, visibility: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 21, skip: (page - 1) * 20,
      })
      return NextResponse.json({ items: options.slice(0, 20), hasMore: options.length > 20 })
    }
    const projects = await prisma.project.findMany({
      where: {
        userId: user.id
      },
      orderBy: [{
        createdAt: 'desc'
      }, {
        id: 'desc'
      }],
      take: 21,
      skip: (page - 1) * 20
    })
    return NextResponse.json({
      items: await Promise.all(projects.slice(0, 20).map(async p => ({
        ...p,
        stats: await focusStats(user.id, p.id)
      }))),
      hasMore: projects.length > 20
    })
  }
  if (id) await ownProject(id, user.id)
  if (request.method === 'DELETE' && id) {
    await prisma.project.delete({
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
  const name = text(data, 'name', 100, true)
  const slug = text(data, 'slug', 80) || slugify(name)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new JournalError('Use lowercase letters, numbers, and single dashes.', 400, 'slug')
  const image = (await ownedImages(data.imageUrl ? [data.imageUrl] : [], user.id))[0] || null
  const status = choice(data.status, projectStatuses, 'PLANNING')
  const visibility = choice(data.visibility, (['PUBLIC', 'PRIVATE'] as const), 'PRIVATE')
  const pinned = flag(data, 'pinned')
  const startedAt = date(data.startedAt)
  const completedAt = status === 'COMPLETED' ? date(data.completedAt) : null
  if (completedAt && completedAt < startedAt) throw new JournalError('Completion must be on or after the start date.')
  const values = {
    name,
    slug,
    imageUrl: image,
    description: text(data, 'description', 280),
    content: text(data, 'content', 20000),
    status,
    visibility,
    pinned,
    websiteUrl: url(data, 'websiteUrl'),
    githubUrl: url(data, 'githubUrl'),
    startedAt,
    completedAt
  }
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1::int FROM pg_advisory_xact_lock(hashtext(${user.id}))`
    if (createId) {
      const existing = await tx.project.findFirst({
        where: {
          id: createId,
          userId: user.id
        }
      })
      if (existing) return existing
    }
    if (pinned) await tx.project.updateMany({
      where: {
        userId: user.id,
        pinned: true
      },
      data: {
        pinned: false
      }
    })
    const project = id ? await tx.project.update({
      where: {
        id
      },
      data: values
    }) : await tx.project.create({
      data: {
        ...values,
        id: createId,
        userId: user.id
      }
    })
    for (const type of [...(!id ? ['PROJECT_CREATED'] : []), ...(status === 'COMPLETED' ? ['PROJECT_COMPLETED'] : [])]) {
      await tx.activityEvent.upsert({
        where: {
          userId_key: {
            userId: user.id,
            key: `${type}:${project.id}`
          }
        },
        create: {
          userId: user.id,
          projectId: project.id,
          key: `${type}:${project.id}`,
          type
        },
        update: {}
      })
    }
    return project
  })
  return NextResponse.json(result)
}
