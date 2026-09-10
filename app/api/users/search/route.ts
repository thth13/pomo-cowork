import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getEffectiveSessionMinutesSql } from '@/lib/sessionStatsSql'

export const dynamic = 'force-dynamic'

interface RankedUser {
  id: string
  username: string
  avatarUrl: string | null
  createdAt: Date
  totalMinutes: number
  totalPomodoros: number
  rank: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const effectiveMinutes = getEffectiveSessionMinutesSql('s')

    // Aggregate in the database instead of transferring every user's session history.
    // Rank before filtering so search results keep their global position.
    const users = await prisma.$queryRaw<RankedUser[]>(Prisma.sql`
      WITH focus_totals AS (
        SELECT
          "s"."userId",
          SUM(${effectiveMinutes})::double precision AS "totalMinutes",
          COUNT(*) FILTER (WHERE "s"."type" = 'WORK')::integer AS "totalPomodoros"
        FROM "pomodoro_sessions" AS "s"
        INNER JOIN "users" AS "u" ON "u"."id" = "s"."userId"
        WHERE "u"."isAnonymous" = false
          AND "s"."status" IN ('COMPLETED', 'CANCELLED')
          AND "s"."type" IN ('WORK', 'TIME_TRACKING')
        GROUP BY "s"."userId"
      ), ranked_users AS (
        SELECT
          "u"."id",
          "u"."username",
          "u"."avatarUrl",
          "u"."createdAt",
          COALESCE("f"."totalMinutes", 0) AS "totalMinutes",
          COALESCE("f"."totalPomodoros", 0) AS "totalPomodoros",
          (ROW_NUMBER() OVER (
            ORDER BY COALESCE("f"."totalMinutes", 0) DESC, "u"."id" ASC
          ))::integer AS "rank"
        FROM "users" AS "u"
        LEFT JOIN focus_totals AS "f" ON "f"."userId" = "u"."id"
        WHERE "u"."isAnonymous" = false
      )
      SELECT * FROM ranked_users
      WHERE STRPOS(LOWER("username"), LOWER(${query})) > 0
      ORDER BY "rank"
      LIMIT 100
    `)

    return NextResponse.json({
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
        isOnline: false,
        rank: user.rank,
        stats: {
          totalHours: Math.round(user.totalMinutes / 60),
          totalPomodoros: user.totalPomodoros,
        },
      })),
    })
  } catch (error) {
    console.error('Error searching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
