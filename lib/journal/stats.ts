import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getEffectiveSessionMinutesSql } from '@/lib/sessionStatsSql'
export type FocusStats = {
  seconds: number;
  sessions: number;
};
export function weekStart(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7)
  return start
}
function scope(userId: string, projectId?: string, from?: Date, to?: Date) {
  return Prisma.sql`"s"."userId" = ${userId} AND "s"."status" = 'COMPLETED'
    AND "s"."type" IN ('WORK', 'TIME_TRACKING')
    ${projectId ? Prisma.sql`AND "s"."projectId" = ${projectId}` : Prisma.empty}
    ${from ? Prisma.sql`AND COALESCE("s"."completedAt", "s"."endedAt", "s"."startedAt") >= ${from}` : Prisma.empty}
    ${to ? Prisma.sql`AND COALESCE("s"."completedAt", "s"."endedAt", "s"."startedAt") <= ${to}` : Prisma.empty}`
}
export async function focusStats(userId: string, projectId?: string, from?: Date, to?: Date, db: Prisma.TransactionClient = prisma): Promise<FocusStats> {
  const [result] = await db.$queryRaw<FocusStats[]>(Prisma.sql`SELECT
    COALESCE(SUM(${getEffectiveSessionMinutesSql('s')} * 60), 0)::float8 AS seconds,
    COUNT(*)::int AS sessions FROM "pomodoro_sessions" "s" WHERE ${scope(userId, projectId, from, to)}`)
  return result
}
export async function focusDays(userId: string) {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setUTCDate(start.getUTCDate() - 364)
  return prisma.$queryRaw<{
    date: string;
    seconds: number;
    sessions: number;
  }[]>(Prisma.sql`
    SELECT TO_CHAR(COALESCE("s"."completedAt", "s"."endedAt", "s"."startedAt"), 'YYYY-MM-DD') AS date,
    SUM(${getEffectiveSessionMinutesSql('s')} * 60)::float8 AS seconds, COUNT(*)::int AS sessions
    FROM "pomodoro_sessions" "s" WHERE ${scope(userId, undefined, start)} GROUP BY date ORDER BY date`)
}
export async function recordFocusAchievements(db: Prisma.TransactionClient, userId: string) {
  const stats = await focusStats(userId, undefined, undefined, undefined, db)
  const streak = await focusStreak(userId, db)
  const events = [...[10, 50, 100, 250, 500, 1000].filter(n => stats.seconds >= n * 3600).map(value => ({
    type: 'FOCUS_HOURS',
    value
  })), ...[25, 100, 500, 1000, 2500].filter(n => stats.sessions >= n).map(value => ({
    type: 'SESSIONS',
    value
  })), ...[7, 30, 100, 365].filter(n => streak >= n).map(value => ({
    type: 'STREAK',
    value
  }))]
  if (events.length) await db.activityEvent.createMany({
    data: events.map(event => ({
      ...event,
      userId,
      key: `${event.type}:${event.value}`
    })),
    skipDuplicates: true
  })
}
export async function focusStreak(userId: string, db: Prisma.TransactionClient = prisma) {
  const [result] = await db.$queryRaw<{
    streak: number;
  }[]>(Prisma.sql`
    WITH days AS (
      SELECT DISTINCT COALESCE("s"."completedAt", "s"."endedAt", "s"."startedAt")::date AS day
      FROM "pomodoro_sessions" "s" WHERE ${scope(userId)} AND ${getEffectiveSessionMinutesSql('s')} > 0
    ), runs AS (
      SELECT day, day + ROW_NUMBER() OVER (ORDER BY day DESC)::int AS run FROM days
    )
    SELECT COUNT(*)::int AS streak FROM runs
    WHERE run = (SELECT run FROM runs WHERE day >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 1 ORDER BY day DESC LIMIT 1)
  `)
  return result?.streak || 0
}
