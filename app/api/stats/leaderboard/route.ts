import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { getEffectiveSessionMinutesSql } from '@/lib/sessionStatsSql'

export const dynamic = 'force-dynamic'

type LeaderboardPeriod = 'day' | 'week' | 'month' | 'year' | 'custom'

interface PeriodWindow {
  start: Date
  end: Date
  label: string
}

interface LeaderboardRow {
  id: string
  username: string
  avatarUrl: string | null
  totalMinutes: number
  totalPomodoros: number
}

type SupportedLocale = 'en-US' | 'es-ES'

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

const formatShortDate = (date: Date, locale: SupportedLocale) => {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

const formatFullDate = (date: Date, locale: SupportedLocale) => {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const formatDateRange = (start: Date, endExclusive: Date, locale: SupportedLocale) => {
  const end = addDays(endExclusive, -1)
  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()
  const sameDay = sameMonth && start.getDate() === end.getDate()

  if (sameDay) {
    return formatFullDate(start, locale)
  }

  if (sameMonth) {
    return `${start.toLocaleString(locale, { month: 'short' })} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`
  }

  if (sameYear) {
    return `${formatShortDate(start, locale)} - ${formatShortDate(end, locale)}, ${start.getFullYear()}`
  }

  return `${formatFullDate(start, locale)} - ${formatFullDate(end, locale)}`
}

const getPeriodWindow = (period: LeaderboardPeriod, offset: number, locale: SupportedLocale, customStart?: string, customEnd?: string): PeriodWindow => {
  const now = new Date()
  const safeOffset = Math.max(0, offset)

  if (period === 'custom') {
    const start = customStart ? startOfLocalDay(new Date(customStart)) : startOfLocalDay(now)
    const end = customEnd ? addDays(startOfLocalDay(new Date(customEnd)), 1) : addDays(startOfLocalDay(now), 1)
    return {
      start,
      end,
      label: formatDateRange(start, end, locale),
    }
  }

  if (period === 'day') {
    const start = startOfLocalDay(addDays(now, -safeOffset))
    const end = addDays(start, 1)
    return {
      start,
      end,
      label: formatDateRange(start, end, locale),
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
      label: formatDateRange(start, end, locale),
    }
  }

  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() - safeOffset, 1)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    return {
      start,
      end,
      label: formatDateRange(start, end, locale),
    }
  }

  const start = new Date(now.getFullYear() - safeOffset, 0, 1)
  const end = new Date(start.getFullYear() + 1, 0, 1)
  return {
    start,
    end,
    label: formatDateRange(start, end, locale),
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
    const locale: SupportedLocale = searchParams.get('locale') === 'es' ? 'es-ES' : 'en-US'
    const periodWindow = getPeriodWindow(period, offset, locale, customStart, customEnd)
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

    const effectiveMinutes = getEffectiveSessionMinutesSql('s')
    const users = await prisma.$queryRaw<LeaderboardRow[]>(Prisma.sql`
      SELECT
        "u"."id",
        "u"."username",
        "u"."avatarUrl",
        COALESCE("stats"."totalMinutes", 0)::integer AS "totalMinutes",
        COALESCE("stats"."totalPomodoros", 0)::integer AS "totalPomodoros"
      FROM "users" AS "u"
      LEFT JOIN (
        SELECT
          "s"."userId",
          COALESCE(SUM(${effectiveMinutes}), 0)::integer AS "totalMinutes",
          COUNT(*) FILTER (WHERE "s"."type" = 'WORK')::integer AS "totalPomodoros"
        FROM "pomodoro_sessions" AS "s"
        WHERE "s"."status" IN ('COMPLETED', 'CANCELLED')
          AND "s"."type" IN ('WORK', 'TIME_TRACKING')
          AND COALESCE("s"."completedAt", "s"."endedAt", "s"."startedAt") >= ${periodStart}
          AND COALESCE("s"."completedAt", "s"."endedAt", "s"."startedAt") < ${periodEnd}
        GROUP BY "s"."userId"
      ) AS "stats" ON "stats"."userId" = "u"."id"
      WHERE "u"."isAnonymous" = false
      ORDER BY "totalMinutes" DESC, "u"."id" ASC
    `)

    const usersWithStats = users.map(user => {
      const totalMinutes = user.totalMinutes
      const totalHours = Math.round((totalMinutes / 60) * 10) / 10
      
      return {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        totalHours,
        totalPomodoros: user.totalPomodoros,
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

    // Добавляем ранги
    const leaderboard = usersWithStats.map((user, index) => ({
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
