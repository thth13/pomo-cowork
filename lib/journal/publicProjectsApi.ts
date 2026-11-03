import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { pageNumber, publicAuthor } from './server'
import { projectOverview } from './projectOverview'
import { projectStatuses } from './validation'

export async function publicProjectsApi(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const page = pageNumber(params.get('page'))
  const search = (params.get('q') || '').trim().slice(0, 100)
  const status = projectStatuses.find(value => value === params.get('status'))
  const where: Prisma.ProjectWhereInput = {
    visibility: 'PUBLIC',
    user: { isAnonymous: false },
    ...(status ? { status } : {}),
    ...(search ? { OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { user: { username: { contains: search, mode: 'insensitive' } } },
      { user: { displayName: { contains: search, mode: 'insensitive' } } },
    ] } : {}),
  }
  const orderBy: Prisma.ProjectOrderByWithRelationInput[] = params.get('sort') === 'popular'
    ? [{ followers: { _count: 'desc' } }, { createdAt: 'desc' }, { id: 'desc' }]
    : [{ createdAt: 'desc' }, { id: 'desc' }]
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where, orderBy, take: 13, skip: (page - 1) * 12,
      select: {
        id: true, userId: true, name: true, slug: true, description: true,
        imageUrl: true, status: true, startedAt: true, workProjectId: true,
        user: { select: publicAuthor },
      },
    }),
    prisma.project.count({ where }),
  ])
  const items = await Promise.all(projects.slice(0, 12).map(async project => {
    // Reuse public-page statistics without querying or exposing task names.
    const overview = await projectOverview({ ...project, showTasks: false }, 1)
    return {
      id: project.id, userId: project.userId, name: project.name, slug: project.slug,
      description: project.description, imageUrl: project.imageUrl, status: project.status,
      startedAt: project.startedAt, author: project.user,
      stats: {
        pomodoros: overview.pomodoros, seconds: overview.seconds,
        totalTasks: overview.totalTasks, completedTasks: overview.completedTasks,
        followers: overview.followers, streak: overview.streak,
        week: overview.week.map(day => ({ date: day.date, minutes: day.minutes })),
      },
    }
  }))
  return NextResponse.json({ items, total, hasMore: projects.length > 12 })
}
