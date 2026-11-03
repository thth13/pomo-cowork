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
  const previous = id ? await ownProject(id, user.id) : null
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
  const workProjectId = text(data, 'workProjectId', 100)
  const newProjectName = text(data, 'newProjectName', 100)
  const newTaskId = newProjectName ? `work-${requestId(data)}` : null
  const workProject = workProjectId ? await prisma.task.findFirst({ where: { id: workProjectId, userId: user.id, parentId: null } }) : null
  if (workProjectId && !workProject) throw new JournalError('Choose one of your projects.', 400, 'workProjectId')
  if (!workProject && !newProjectName && (!previous || previous.workProjectId)) throw new JournalError('Choose a project or create one.', 400, 'workProjectId')
  const name = workProject?.title || newProjectName || previous!.name
  if (name.length > 100) throw new JournalError('Shorten the project name to 100 characters.', 400, 'workProjectId')
  const baseSlug = slugify(name)
  const slug = previous?.slug || baseSlug
  const image = (await ownedImages(data.imageUrl ? [data.imageUrl] : [], user.id))[0] || null
  const coverUrl = (await ownedImages(data.coverUrl ? [data.coverUrl] : [], user.id))[0] || null
  const showTasks = flag(data, 'showTasks')
  const status = choice(data.status, projectStatuses, previous?.status || 'BUILDING')
  const visibility = choice(data.visibility, (['PUBLIC', 'PRIVATE'] as const), 'PRIVATE')
  const pinned = flag(data, 'pinned')
  const startedAt = date(data.startedAt)
  const completedAt = status === 'COMPLETED' ? date(data.completedAt) : null
  if (completedAt && completedAt < startedAt) throw new JournalError('Completion must be on or after the start date.')
  const values = {
    name,
    slug,
    coverUrl,
    showTasks,
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
    if (!previous) {
      let suffix = 2
      while (await tx.project.findUnique({ where: { userId_slug: { userId: user.id, slug: values.slug } }, select: { id: true } })) {
        values.slug = `${baseSlug}-${suffix++}`
      }
    }
    const selected = workProject ? await tx.task.findFirst({ where: { id: workProject.id, userId: user.id, parentId: null } }) : null
    if (workProject && !selected) throw new JournalError('Project not found.', 404)
    const createdBefore = newTaskId ? await tx.task.findFirst({ where: { id: newTaskId, userId: user.id, parentId: null } }) : null
    const linked = selected || createdBefore || (newTaskId ? await tx.task.create({ data: { id: newTaskId, userId: user.id, title: newProjectName } }) : null)
    const linkId = linked?.id || previous?.workProjectId || null
    if (linkId) {
      const duplicate = await tx.project.findUnique({ where: { workProjectId: linkId }, select: { id: true } })
      if (duplicate && duplicate.id !== id) throw new JournalError('This project already has a page. Open it from My projects to edit it.', 409, 'workProjectId')
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
      data: { ...values, workProjectId: linkId }
    }) : await tx.project.create({
      data: {
        ...values,
        workProjectId: linkId,
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
  return NextResponse.json({ ...result, username: user.username })
}

export async function workProjectsApi(request: NextRequest) {
  const user = await requireUser(request)
  const page = pageNumber(request.nextUrl.searchParams.get('page'))
  const select = { id: true, title: true, color: true, createdAt: true, publicPage: { select: { id: true, visibility: true } } } as const
  const items = await prisma.task.findMany({
    where: { userId: user.id, parentId: null }, select,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 51, skip: (page - 1) * 50,
  })
  const selectedId = request.nextUrl.searchParams.get('selected')
  const selected = selectedId ? await prisma.task.findFirst({ where: { id: selectedId, userId: user.id, parentId: null }, select }) : null
  return NextResponse.json({ items: items.slice(0, 50), hasMore: items.length > 50, selected })
}
