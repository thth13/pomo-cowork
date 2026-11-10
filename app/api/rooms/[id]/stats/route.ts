import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { endOfDay, format, startOfDay, subDays } from 'date-fns'
import { getPeriodWindow, isLeaderboardPeriod } from '@/lib/leaderboardPeriod'
import { getEffectiveMinutes, getSessionAttributionDate } from '@/lib/sessionStats'

export const dynamic = 'force-dynamic'

const canAccessRoom = async (roomId: string, token: string | null) => {
  const payload = token ? verifyToken(token) : null
  const userId = payload?.userId ?? null

  const room = await prisma.room.findFirst({
    where: {
      id: roomId,
      ...(userId
        ? {
            OR: [
              { privacy: 'PUBLIC' },
              { ownerId: userId },
              { members: { some: { userId } } },
            ],
          }
        : { privacy: 'PUBLIC' }),
    },
    select: { id: true },
  })

  return { ok: Boolean(room) }
}

// GET /api/rooms/[id]/stats - Aggregated room stats + weekly activity
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    const access = await canAccessRoom(params.id, token)
    if (!access.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const requestedPeriod = searchParams.get('period')
    const period = isLeaderboardPeriod(requestedPeriod) ? requestedPeriod : null
    const customStart = searchParams.get('startDate') || undefined
    const customEnd = searchParams.get('endDate') || undefined
    if (period === 'custom' && (!customStart || !customEnd || !Number.isFinite(Date.parse(customStart)) || !Number.isFinite(Date.parse(customEnd)) || Date.parse(customStart) > Date.parse(customEnd))) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
    }
    const offset = Math.max(0, Math.min(1000, parseInt(searchParams.get('offset') || '0', 10) || 0))
    const periodWindow = period ? getPeriodWindow(period, offset, searchParams.get('locale') === 'es' ? 'es-ES' : 'en-US', customStart, customEnd) : null
    const now = new Date()

    const focusSessions = await prisma.pomodoroSession.findMany({
      where: {
        roomId: params.id,
        status: { in: ['COMPLETED', 'CANCELLED'] },
        type: { in: ['WORK', 'TIME_TRACKING'] },
      },
      select: {
        id: true,
        userId: true,
        type: true,
        status: true,
        duration: true,
        startedAt: true,
        endedAt: true,
        completedAt: true,
        pausedAt: true,
        remainingSeconds: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            experience: true,
            isPro: true,
            proExpiresAt: true,
          },
        },
      },
      orderBy: { startedAt: 'asc' },
    })

    const workSessions = focusSessions.filter((session) => session.type === 'WORK')

    const totalPomodoros = workSessions.length
    const totalFocusMinutes = focusSessions.reduce((sum, session) => sum + getEffectiveMinutes(session), 0)

    const dailyMinutesMap = new Map<string, number>()
    focusSessions.forEach((session) => {
      const key = format(getSessionAttributionDate(session), 'yyyy-MM-dd')
      dailyMinutesMap.set(key, (dailyMinutesMap.get(key) ?? 0) + getEffectiveMinutes(session))
    })

    const activeDaysCount = dailyMinutesMap.size
    const avgDailyFocusMinutes = activeDaysCount > 0 ? Math.round(totalFocusMinutes / activeDaysCount) : 0

    const weeklyActivity: Array<{ date: string; hours: number }> = []
    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i)
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)

      const dayMinutes = focusSessions.reduce((sum, session) => {
        const sessionDate = getSessionAttributionDate(session)
        if (sessionDate < dayStart || sessionDate > dayEnd) return sum
        return sum + getEffectiveMinutes(session)
      }, 0)

      weeklyActivity.push({
        date: format(date, 'yyyy-MM-dd'),
        hours: Math.round((dayMinutes / 60) * 10) / 10,
      })
    }

    const minutesByUser = new Map<
      string,
      { id: string; username: string; avatarUrl: string | null; minutes: number; totalPomodoros: number; experience: number; isPro: boolean }
    >()

    const rankingSessions = periodWindow ? focusSessions.filter(session => {
      const date = getSessionAttributionDate(session)
      return date >= periodWindow.start && date < periodWindow.end
    }) : focusSessions
    const rankingMinutes = rankingSessions.reduce((sum, session) => sum + getEffectiveMinutes(session), 0)

    rankingSessions.forEach((session) => {
      if (!session.user) return
      const existing = minutesByUser.get(session.user.id)
      const addMinutes = getEffectiveMinutes(session)
      if (existing) {
        existing.minutes += addMinutes
        if (session.type === 'WORK') existing.totalPomodoros += 1
      } else {
        minutesByUser.set(session.user.id, {
          id: session.user.id,
          username: session.user.username,
          avatarUrl: session.user.avatarUrl,
          minutes: addMinutes,
          totalPomodoros: session.type === 'WORK' ? 1 : 0,
          experience: session.user.experience,
          isPro: session.user.isPro && (!session.user.proExpiresAt || session.user.proExpiresAt > now),
        })
      }
    })

    const topUsers = Array.from(minutesByUser.values())
      .filter((u) => u.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes || a.id.localeCompare(b.id))
      .slice(0, 10)
      .map((u, index) => ({
        id: u.id,
        username: u.username,
        totalMinutes: u.minutes,
        totalPomodoros: u.totalPomodoros,
        experience: u.experience,
        isPro: u.isPro,
        rank: index + 1,
        avatarUrl: u.avatarUrl ?? undefined,
        hours: Math.round((u.minutes / 60) * 10) / 10,
        contributionPercent:
          rankingMinutes > 0 ? Math.round((u.minutes / rankingMinutes) * 1000) / 10 : 0,
      }))

    return NextResponse.json({
      totalPomodoros,
      totalFocusMinutes,
      totalFocusHours: Math.round((totalFocusMinutes / 60) * 10) / 10,
      avgDailyFocusMinutes,
      weeklyActivity,
      topUsers,
      periodLabel: periodWindow?.label ?? null,
    })
  } catch (error) {
    console.error('Room stats error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
