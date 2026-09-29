import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { hasActiveProAccess } from '@/lib/pro'
import { buildStatistics } from '@/lib/statistics'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const token = getTokenFromHeader(request.headers.get('authorization'))
  const payload = token ? verifyToken(token) : null
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const timezone = request.nextUrl.searchParams.get('timezone') || 'UTC'
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format() }
  catch { return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 }) }

  try {
    const [user, sessions] = await Promise.all([
      prisma.user.findUnique({ where: { id: payload.userId }, select: { experience: true, isPro: true, proExpiresAt: true } }),
      prisma.pomodoroSession.findMany({
        where: { userId: payload.userId, status: { in: ['COMPLETED', 'CANCELLED'] }, type: { in: ['WORK', 'TIME_TRACKING', 'SHORT_BREAK', 'LONG_BREAK'] } },
        select: { id: true, type: true, status: true, task: true, duration: true, startedAt: true, endedAt: true, completedAt: true, pausedAt: true, remainingSeconds: true },
        orderBy: { startedAt: 'asc' },
      }),
    ])
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const statistics = buildStatistics(sessions, user.experience, timezone)
    if (!hasActiveProAccess(user)) { statistics.access = 'basic'; statistics.details = null }
    return NextResponse.json(statistics, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Statistics dashboard error:', error)
    return NextResponse.json({ error: 'Unable to load statistics' }, { status: 500 })
  }
}
