import { createHash, randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { JournalError, requireUser, viewer } from './server'

export async function projectFollowApi(request: NextRequest, projectId: string) {
  const user = request.method === 'GET' ? await viewer(request) : await requireUser(request)
  return prisma.$transaction(async tx => {
    // Serialize social writes with visibility changes to this page.
    const rows = await tx.$queryRaw<{ userId: string }[]>`SELECT "userId" FROM "projects" WHERE id = ${projectId} AND visibility = 'PUBLIC' FOR UPDATE`
    if (!rows.length) throw new JournalError('Project not found.', 404)
    if (request.method !== 'GET' && user?.id === rows[0].userId) throw new JournalError('You cannot follow your own project.')
    if (user && request.method === 'PUT') await tx.projectFollow.upsert({
      where: { userId_projectId: { userId: user.id, projectId } }, create: { userId: user.id, projectId }, update: {},
    })
    if (user && request.method === 'DELETE') await tx.projectFollow.deleteMany({ where: { userId: user.id, projectId } })
    const [count, following] = await Promise.all([
      tx.projectFollow.count({ where: { projectId } }),
      user ? tx.projectFollow.findUnique({ where: { userId_projectId: { userId: user.id, projectId } } }) : null,
    ])
    return NextResponse.json({ count, following: Boolean(following) })
  })
}

export async function projectViewApi(request: NextRequest, projectId: string) {
  const user = await viewer(request)
  const cookie = request.cookies.get('project-visitor')?.value
  const visitor = cookie && /^[a-f0-9-]{36}$/.test(cookie) ? cookie : randomUUID()
  const visitorHash = createHash('sha256').update(`${projectId}:${user ? `user:${user.id}` : visitor}`).digest('hex')
  const day = new Date().toISOString().slice(0, 10)
  const views = await prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<{ userId: string; views: number }[]>`SELECT "userId", views FROM "projects" WHERE id = ${projectId} AND visibility = 'PUBLIC' FOR UPDATE`
    if (!rows.length) throw new JournalError('Project not found.', 404)
    if (rows[0].userId === user?.id) return rows[0].views
    const visit = await tx.projectView.createMany({ data: [{ projectId, visitorHash, day }], skipDuplicates: true })
    if (!visit.count) return rows[0].views
    const project = await tx.project.update({ where: { id: projectId }, data: { views: { increment: 1 } }, select: { views: true } })
    // Only today's deduplication keys are needed; the lifetime total is on Project.
    await tx.projectView.deleteMany({ where: { projectId, day: { lt: day } } })
    return project.views
  })
  const response = NextResponse.json({ views })
  response.cookies.set('project-visitor', visitor, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 31536000, path: '/' })
  return response
}
