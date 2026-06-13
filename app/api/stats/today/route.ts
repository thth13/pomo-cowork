import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getEffectiveSessionMinutesSql } from '@/lib/sessionStatsSql'

export const dynamic = 'force-dynamic'

interface TodayStatsRow {
  pomodoros: number
  focusMinutes: number
  activeUsers: number
  currentUserRank: number | null
  currentUserPomodoros: number | null
  currentUserFocusMinutes: number | null
}

interface CommunityTodayStatsRow {
  pomodoros: number
  focusMinutes: number
  activeUsers: number
}

const getRequestedRange = (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const start = new Date(searchParams.get('dayStart') ?? '')
  const end = new Date(searchParams.get('dayEnd') ?? '')
  const rangeMs = end.getTime() - start.getTime()

  if (
    Number.isNaN(start.getTime())
    || Number.isNaN(end.getTime())
    || rangeMs <= 0
    || rangeMs > 48 * 60 * 60 * 1000
  ) {
    return null
  }

  return { start, end }
}

export async function GET(request: NextRequest) {
  try {
    const range = getRequestedRange(request)
    if (!range) {
      return NextResponse.json({ error: 'Invalid day range' }, { status: 400 })
    }

    const token = getTokenFromHeader(request.headers.get('authorization'))
    const currentUserId = token ? verifyToken(token)?.userId ?? null : null
    const effectiveMinutes = getEffectiveSessionMinutesSql('s')

    if (!currentUserId) {
      const rows = await prisma.$queryRaw<CommunityTodayStatsRow[]>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (
            WHERE "s"."type" = 'WORK'
          )::integer AS "pomodoros",
          COALESCE(SUM(${effectiveMinutes}) FILTER (
            WHERE "s"."type" IN ('WORK', 'TIME_TRACKING')
          ), 0)::integer AS "focusMinutes",
          COUNT(DISTINCT "s"."userId")::integer AS "activeUsers"
        FROM "pomodoro_sessions" AS "s"
        WHERE "s"."status" = 'COMPLETED'
          AND "s"."roomId" IS NULL
          AND "s"."startedAt" >= ${range.start}
          AND "s"."startedAt" < ${range.end}
      `)
      const stats = rows[0]

      return NextResponse.json({
        community: {
          pomodoros: stats?.pomodoros ?? 0,
          focusMinutes: stats?.focusMinutes ?? 0,
          activeUsers: stats?.activeUsers ?? 0,
        },
        currentUser: null,
      })
    }

    const rows = await prisma.$queryRaw<TodayStatsRow[]>(Prisma.sql`
      WITH "periodSessions" AS (
        SELECT
          "s"."userId",
          "s"."roomId",
          "s"."type",
          "s"."status",
          ${effectiveMinutes} AS "minutes"
        FROM "pomodoro_sessions" AS "s"
        WHERE "s"."status" IN ('COMPLETED', 'CANCELLED')
          AND "s"."startedAt" >= ${range.start}
          AND "s"."startedAt" < ${range.end}
      ),
      "userStats" AS (
        SELECT
          "u"."id",
          COALESCE(SUM("p"."minutes") FILTER (
            WHERE "p"."type" IN ('WORK', 'TIME_TRACKING')
          ), 0)::integer AS "focusMinutes",
          COUNT(*) FILTER (WHERE "p"."type" = 'WORK')::integer AS "pomodoros"
        FROM "users" AS "u"
        LEFT JOIN "periodSessions" AS "p" ON "p"."userId" = "u"."id"
        WHERE "u"."isAnonymous" = false
        GROUP BY "u"."id"
      ),
      "rankedUsers" AS (
        SELECT
          "id",
          "focusMinutes",
          "pomodoros",
          (
            ROW_NUMBER() OVER (
              ORDER BY "focusMinutes" DESC, "id" ASC
            )
          )::integer AS "rank"
        FROM "userStats"
      ),
      "communityStats" AS (
        SELECT
          COUNT(*) FILTER (
            WHERE "status" = 'COMPLETED'
              AND "type" = 'WORK'
              AND "roomId" IS NULL
          )::integer AS "pomodoros",
          COALESCE(SUM("minutes") FILTER (
            WHERE "status" = 'COMPLETED'
              AND "type" IN ('WORK', 'TIME_TRACKING')
              AND "roomId" IS NULL
          ), 0)::integer AS "focusMinutes",
          COUNT(DISTINCT "userId") FILTER (
            WHERE "status" = 'COMPLETED'
              AND "roomId" IS NULL
          )::integer AS "activeUsers"
        FROM "periodSessions"
      )
      SELECT
        "c"."pomodoros",
        "c"."focusMinutes",
        "c"."activeUsers",
        "r"."rank" AS "currentUserRank",
        "r"."pomodoros" AS "currentUserPomodoros",
        "r"."focusMinutes" AS "currentUserFocusMinutes"
      FROM "communityStats" AS "c"
      LEFT JOIN "rankedUsers" AS "r" ON "r"."id" = ${currentUserId}
    `)

    const stats = rows[0]
    return NextResponse.json({
      community: {
        pomodoros: stats?.pomodoros ?? 0,
        focusMinutes: stats?.focusMinutes ?? 0,
        activeUsers: stats?.activeUsers ?? 0,
      },
      currentUser: {
        rank: stats?.currentUserRank ?? null,
        pomodoros: stats?.currentUserPomodoros ?? 0,
        focusMinutes: stats?.currentUserFocusMinutes ?? 0,
      },
    })
  } catch (error) {
    console.error('Get today stats error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
