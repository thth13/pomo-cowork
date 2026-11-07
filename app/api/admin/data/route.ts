import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { authorizeAdmin } from '@/lib/adminRequest'
import { getEffectiveMinutes } from '@/lib/sessionStats'

export const dynamic = 'force-dynamic'
const identity = { id: true, username: true, isAnonymous: true } as const
const pageSize = 50

// Read-only POST keeps potentially long presence ID lists out of the URL.
export async function POST(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request)
    if (denied) return denied
    const body = await request.json().catch(() => null)
    if (!body || !['directory', 'online', 'wall', 'habits', 'visitors'].includes(body.kind) || !Number.isSafeInteger(body.page) || body.page < 1) {
      return NextResponse.json({ error: 'Invalid list or page.' }, { status: 400 })
    }
    if (body.kind === 'online' && (!Array.isArray(body.onlineIds) || body.onlineIds.length > 10000 || body.onlineIds.some((id: unknown) => typeof id !== 'string' || id.length > 128))) {
      return NextResponse.json({ error: 'Invalid presence list.' }, { status: 400 })
    }
    if (body.kind === 'directory' && !['registered', 'anonymous'].includes(body.userType)) {
      return NextResponse.json({ error: 'Invalid account filter.' }, { status: 400 })
    }
    const respond = (rows: unknown[], total: number, page: number) => NextResponse.json({ rows, total, page, pageSize }, { headers: { 'Cache-Control': 'private, no-store' } })
    const paging = (total: number) => {
      const page = Math.min(body.page, Math.max(1, Math.ceil(total / pageSize)))
      return { page, skip: (page - 1) * pageSize, take: pageSize }
    }
    if (body.kind === 'visitors') {
      if (body.referrer !== undefined && (typeof body.referrer !== 'string' || body.referrer.length > 500)) {
        return NextResponse.json({ error: 'Invalid referrer filter.' }, { status: 400 })
      }
      // Read the saved, sanitized URL; missing historical details also count as unknown.
      const source = Prisma.sql`NULLIF(details->>'referrer', '')`
      const filter = body.referrer === '__none__' ? Prisma.sql`WHERE ${source} IS NULL`
        : body.referrer ? Prisma.sql`WHERE ${source} = ${body.referrer}` : Prisma.empty
      const [counts, referrers] = await Promise.all([
        prisma.$queryRaw<{ total: bigint }[]>`SELECT COUNT(*) AS total FROM guest_visits ${filter}`,
        prisma.$queryRaw<{ referrer: string }[]>`SELECT DISTINCT ${source} AS referrer FROM guest_visits WHERE ${source} IS NOT NULL ORDER BY referrer`,
      ])
      const total = Number(counts[0].total)
      const { page, skip, take } = paging(total)
      const rows = await prisma.$queryRaw`SELECT id, "ipAddress", "countryCode", "pagePath", "createdAt", details
        FROM guest_visits ${filter} ORDER BY "createdAt" DESC, id DESC LIMIT ${take} OFFSET ${skip}`
      return NextResponse.json({ rows, total, page, pageSize, referrers: referrers.map(row => row.referrer) }, { headers: { 'Cache-Control': 'private, no-store' } })
    }
    if (body.kind === 'directory' || body.kind === 'online') {
      const where: Prisma.UserWhereInput = body.kind === 'online' ? { id: { in: body.onlineIds } } : { isAnonymous: body.userType === 'anonymous' }
      const total = await prisma.user.count({ where })
      const { page, skip, take } = paging(total)
      if (body.kind === 'online' && body.compact === true) {
        const rows = await prisma.user.findMany({
          where, skip, take, orderBy: [{ username: 'asc' }, { id: 'asc' }], select: identity,
        })
        return respond(rows, total, page)
      }
      const users = await prisma.user.findMany({
        where, skip, take, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          ...identity, countryCode: true, createdAt: true, lastSeenAt: true,
          sessions: {
            where: { status: { in: ['COMPLETED', 'CANCELLED'] }, type: { in: ['WORK', 'TIME_TRACKING'] } },
            select: { startedAt: true, endedAt: true, completedAt: true, duration: true, remainingSeconds: true, pausedAt: true, type: true, status: true },
          },
        },
      })
      return respond(users.map(({ sessions, ...user }) => ({ ...user,
        totalMinutes: sessions.reduce((sum, session) => sum + getEffectiveMinutes(session), 0),
        totalPomodoros: sessions.filter(session => session.type === 'WORK').length, sessionsCount: sessions.length,
      })), total, page)
    }
    if (body.kind === 'wall') {
      const total = await prisma.userWallMessage.count()
      const { page, skip, take } = paging(total)
      const rows = await prisma.userWallMessage.findMany({ skip, take, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { id: true, message: true, createdAt: true, author: { select: identity }, profileUser: { select: identity } },
      })
      return respond(rows, total, page)
    }
    const total = await prisma.habit.count()
    const { page, skip, take } = paging(total)
    const rows = await prisma.habit.findMany({ skip, take, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, title: true, startDate: true, archived: true, createdAt: true, user: { select: identity }, _count: { select: { completions: true } } },
    })
    return respond(rows, total, page)
  } catch (error) {
    console.error('Admin list failed:', error)
    return NextResponse.json({ error: 'Could not load this list. Please retry.' }, { status: 500 })
  }
}
