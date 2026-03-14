import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { getEffectiveMinutes, getSessionAttributionDate } from '@/lib/sessionStats'

export const dynamic = 'force-dynamic'

type LeaderboardPeriod = 'day' | 'week' | 'month' | 'year'

const isLeaderboardPeriod = (value: string | null): value is LeaderboardPeriod => {
  return value === 'day' || value === 'week' || value === 'month' || value === 'year'
}

const getPeriodStart = (period: LeaderboardPeriod) => {
  const now = new Date()
  const start = new Date(now)

  if (period === 'day') {
    start.setHours(0, 0, 0, 0)
    return start
  }

  if (period === 'week') {
    const day = start.getDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    start.setDate(start.getDate() - diffToMonday)
    start.setHours(0, 0, 0, 0)
    return start
  }

  if (period === 'month') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    return start
  }

  start.setMonth(0, 1)
  start.setHours(0, 0, 0, 0)
  return start
}

const getPeriodLabel = (period: LeaderboardPeriod) => {
  if (period === 'day') return 'Today'
  if (period === 'week') return 'This week'
  if (period === 'month') return 'This month'
  return 'This year'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestedPeriod = searchParams.get('period')
    const period: LeaderboardPeriod = isLeaderboardPeriod(requestedPeriod) ? requestedPeriod : 'month'
    const periodStart = getPeriodStart(period)

    // Получаем текущего пользователя если авторизован
    const authHeader = request.headers.get('authorization')
    const token = authHeader ? getTokenFromHeader(authHeader) : null
    let currentUserId: string | null = null

    if (token) {
      const payload = verifyToken(token)
      if (payload) {
        currentUserId = payload.userId
      }
    }

    // Получаем всех пользователей с сессиями только за выбранный период.
    const users = await prisma.user.findMany({
      where: {
        isAnonymous: false,
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        sessions: {
          where: {
            status: { in: ['COMPLETED', 'CANCELLED'] },
            type: { in: ['WORK', 'TIME_TRACKING'] },
            OR: [
              { completedAt: { gte: periodStart } },
              { endedAt: { gte: periodStart } },
            ],
          },
          select: {
            startedAt: true,
            endedAt: true,
            completedAt: true,
            duration: true,
            remainingSeconds: true,
            pausedAt: true,
            type: true,
          }
        }
      }
    })

    // Вычисляем статистику только по сессиям, которые действительно относятся к выбранному периоду.
    const usersWithStats = users.map(user => {
      const periodSessions = user.sessions.filter((session) => getSessionAttributionDate(session) >= periodStart)
      const totalMinutes = periodSessions.reduce((sum, session) => sum + getEffectiveMinutes(session), 0)
      const totalHours = Math.round(totalMinutes / 60)
      const totalPomodoros = periodSessions.filter((session) => session.type === 'WORK').length
      
      return {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        totalHours,
        totalPomodoros,
        totalMinutes
      }
    })

    const periodTotals = usersWithStats.reduce(
      (acc, user) => {
        acc.totalMinutes += user.totalMinutes
        acc.totalPomodoros += user.totalPomodoros
        return acc
      },
      { totalMinutes: 0, totalPomodoros: 0 }
    )

    // Сортируем по минутам для точности (пользователи без активности будут внизу)
    const sortedUsers = usersWithStats.sort((a, b) => b.totalMinutes - a.totalMinutes)

    // Добавляем ранги
    const leaderboard = sortedUsers.map((user, index) => ({
      ...user,
      rank: index + 1
    }))

    // Топ 10 пользователей
    const topUsers = leaderboard.slice(0, 10)

    // Находим текущего пользователя
    let currentUser = null
    if (currentUserId) {
      currentUser = leaderboard.find(u => u.id === currentUserId) || null
    }

    return NextResponse.json({
      period,
      periodLabel: getPeriodLabel(period),
      periodStart: periodStart.toISOString(),
      leaderboard,
      topUsers,
      currentUser,
      totalUsers: leaderboard.length,
      periodTotals: {
        ...periodTotals,
        totalHours: Math.round(periodTotals.totalMinutes / 60),
      },
    })

  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
