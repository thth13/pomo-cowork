import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getEffectiveSessionMinutesSql } from '@/lib/sessionStatsSql'
import { shiftDate } from '@/lib/statistics'
import { buildMonthlyWrapped, shiftMonth, type MonthlyWrapped } from './analytics'

export async function getMonthlyWrapped(userId: string, monthStart: string, timezone: string): Promise<MonthlyWrapped> {
  const existing = await prisma.monthlyWrapped.findUnique({ where: { userId_monthStart: { userId, monthStart } } })
  if (existing) return existing.snapshot as unknown as MonthlyWrapped
  // Broad UTC bounds contain every IANA offset. Local date filtering happens below.
  const from = new Date(`${shiftDate(shiftMonth(monthStart, -1), -1)}T00:00:00Z`)
  const to = new Date(`${shiftDate(shiftMonth(monthStart, 1), 1)}T00:00:00Z`)
  const sessions = await prisma.pomodoroSession.findMany({
    where: { userId, type: { in: ['WORK', 'TIME_TRACKING'] }, status: { in: ['COMPLETED', 'CANCELLED'] },
      OR: [{ completedAt: { gte: from, lt: to } }, { completedAt: null, endedAt: { gte: from, lt: to } }] },
    select: { type: true, status: true, duration: true, remainingSeconds: true, startedAt: true, endedAt: true, completedAt: true, pausedAt: true, project: { select: { id: true, name: true } } },
  })
  const report = buildMonthlyWrapped(sessions, monthStart, timezone)
  if (report.totalFocusMinutes > 0) {
    // Same absolute month window (viewer's timezone) and completion attribution.
    // Stopped trackers use stored elapsed duration, as in getEffectiveMinutes.
    const [cohort] = await prisma.$queryRaw<{ size: number; below: number }[]>(Prisma.sql`
      WITH totals AS (
        SELECT "s"."userId", SUM(CASE WHEN "s"."type" = 'TIME_TRACKING' AND "s"."status" = 'CANCELLED'
          AND ("s"."remainingSeconds" = 0 OR ABS("s"."duration" * 60 + "s"."remainingSeconds" - 86400) <= 30)
          THEN GREATEST(0, "s"."duration") ELSE ${getEffectiveSessionMinutesSql('s')} END) AS minutes
        FROM "pomodoro_sessions" "s" JOIN "users" "u" ON "u"."id" = "s"."userId"
        WHERE NOT "u"."isAnonymous" AND "s"."type" IN ('WORK', 'TIME_TRACKING')
          AND ("s"."status" = 'COMPLETED' OR ("s"."type" = 'TIME_TRACKING' AND "s"."status" = 'CANCELLED'))
          AND COALESCE("s"."completedAt", "s"."endedAt") >= ((${monthStart}::date::timestamp AT TIME ZONE ${timezone}) AT TIME ZONE 'UTC')
          AND COALESCE("s"."completedAt", "s"."endedAt") < ((${shiftMonth(monthStart, 1)}::date::timestamp AT TIME ZONE ${timezone}) AT TIME ZONE 'UTC')
        GROUP BY "s"."userId"
      ) SELECT COUNT(*)::int AS size, COUNT(*) FILTER (WHERE minutes < ${report.totalFocusMinutes})::int AS below
      FROM totals WHERE minutes >= 25 AND "userId" <> ${userId}
    `)
    report.communitySize = cohort?.size ?? 0
    if (report.communitySize >= 30) report.percentile = Math.floor(cohort.below / cohort.size * 100)
  }
  const saved = await prisma.monthlyWrapped.upsert({
    where: { userId_monthStart: { userId, monthStart } }, update: {},
    create: { userId, monthStart, timezone, snapshot: report as unknown as Prisma.InputJsonValue },
  })
  return saved.snapshot as unknown as MonthlyWrapped
}
