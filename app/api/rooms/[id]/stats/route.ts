import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { endOfDay, format, startOfDay, subDays } from 'date-fns'
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
      { id: string; username: string; avatarUrl: string | null; minutes: number }
    >()

    focusSessions.forEach((session) => {
      if (!session.user) return
      const existing = minutesByUser.get(session.user.id)
      const addMinutes = getEffectiveMinutes(session)
      if (existing) {
        existing.minutes += addMinutes
      } else {
        minutesByUser.set(session.user.id, {
          id: session.user.id,
          username: session.user.username,
          avatarUrl: session.user.avatarUrl,
          minutes: addMinutes,
        })
      }
    })

    const topUsers = Array.from(minutesByUser.values())
      .map((u) => ({
        id: u.id,
        username: u.username,
        avatarUrl: u.avatarUrl ?? undefined,
        hours: Math.round((u.minutes / 60) * 10) / 10,
        contributionPercent:
          totalFocusMinutes > 0 ? Math.round((u.minutes / totalFocusMinutes) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10)

    return NextResponse.json({
      totalPomodoros,
      totalFocusMinutes,
      totalFocusHours: Math.round((totalFocusMinutes / 60) * 10) / 10,
      avgDailyFocusMinutes,
      weeklyActivity,
      topUsers,
    })
  } catch (error) {
    console.error('Room stats error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
