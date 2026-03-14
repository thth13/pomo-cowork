import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { getEffectiveMinutes, getSessionAttributionDate } from '@/lib/sessionStats'

export const dynamic = 'force-dynamic'

type LeaderboardPeriod = 'day' | 'week' | 'month' | 'year' | 'custom'

interface PeriodWindow {
  start: Date
  end: Date
  label: string
}

const isLeaderboardPeriod = (value: string | null): value is LeaderboardPeriod => {
  return value === 'day' || value === 'week' || value === 'month' || value === 'year' || value === 'custom'
}

const startOfLocalDay = (date: Date) => {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

const addDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const formatShortDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

const formatFullDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const formatDateRange = (start: Date, endExclusive: Date) => {
  const end = addDays(endExclusive, -1)
  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()
  const sameDay = sameMonth && start.getDate() === end.getDate()

  if (sameDay) {
    return formatFullDate(start)
  }

  if (sameMonth) {
    return `${start.toLocaleString('en-US', { month: 'short' })} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`
  }

  if (sameYear) {
    return `${formatShortDate(start)} - ${formatShortDate(end)}, ${start.getFullYear()}`
  }

  return `${formatFullDate(start)} - ${formatFullDate(end)}`
}

const getPeriodWindow = (period: LeaderboardPeriod, offset: number, customStart?: string, customEnd?: string): PeriodWindow => {
  const now = new Date()
  const safeOffset = Math.max(0, offset)

  if (period === 'custom') {
    const start = customStart ? startOfLocalDay(new Date(customStart)) : startOfLocalDay(now)
    const end = customEnd ? addDays(startOfLocalDay(new Date(customEnd)), 1) : addDays(startOfLocalDay(now), 1)
    return {
      start,
      end,
      label: formatDateRange(start, end),
    }
  }

  if (period === 'day') {
    const start = startOfLocalDay(addDays(now, -safeOffset))
    const end = addDays(start, 1)
    return {
      start,
      end,
      label: formatDateRange(start, end),
    }
  }

  if (period === 'week') {
    const start = startOfLocalDay(addDays(now, -safeOffset * 7))
    const day = start.getDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    start.setDate(start.getDate() - diffToMonday)
    const end = addDays(start, 7)
    return {
      start,
      end,
      label: formatDateRange(start, end),
    }
  }

  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() - safeOffset, 1)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    return {
      start,
      end,
      label: formatDateRange(start, end),
    }
  }

  const start = new Date(now.getFullYear() - safeOffset, 0, 1)
  const end = new Date(start.getFullYear() + 1, 0, 1)
  return {
    start,
    end,
    label: formatDateRange(start, end),
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestedPeriod = searchParams.get('period')
    const period: LeaderboardPeriod = isLeaderboardPeriod(requestedPeriod) ? requestedPeriod : 'month'
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)
    const customStart = searchParams.get('startDate') || undefined
    const customEnd = searchParams.get('endDate') || undefined
    const periodWindow = getPeriodWindow(period, offset, customStart, customEnd)
    const { start: periodStart, end: periodEnd, label: periodLabel } = periodWindow

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
              { completedAt: { gte: periodStart, lt: periodEnd } },
              { endedAt: { gte: periodStart, lt: periodEnd } },
              { startedAt: { gte: periodStart, lt: periodEnd } },
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
      const periodSessions = user.sessions.filter((session) => {
        const attributionDate = getSessionAttributionDate(session)
        return attributionDate >= periodStart && attributionDate < periodEnd
      })
      const totalMinutes = periodSessions.reduce((sum, session) => sum + getEffectiveMinutes(session), 0)
      const totalHours = Math.round((totalMinutes / 60) * 10) / 10
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
      periodLabel,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      offset,
      isCurrentPeriod: offset === 0,
      leaderboard,
      topUsers,
      currentUser,
      totalUsers: leaderboard.length,
      periodTotals: {
        ...periodTotals,
        totalHours: Math.round((periodTotals.totalMinutes / 60) * 10) / 10,
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
