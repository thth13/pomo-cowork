import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getEffectiveSessionMinutesSql } from '@/lib/sessionStatsSql'
import { awardAchievements } from './server'

export interface RankedFocusUser { id: string; totalMinutes: number }
export function leaderboardWeek(now = new Date()) {
  // Deliberately identical to the existing leaderboard: server calendar,
  // Monday–Sunday, total effective work/tracker minutes, stable user-id ties.
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (start.getDay() + 6) % 7)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}
export async function recordLeaderboardRanks(db: Prisma.TransactionClient, users: RankedFocusUser[], champion = false) {
  for (let index = 0; index < Math.min(100, users.length); index++) {
    const user = users[index]
    if (user.totalMinutes <= 0) continue
    await db.$executeRaw`INSERT INTO "achievement_state" ("userId") VALUES (${user.id}) ON CONFLICT DO NOTHING`
    // Same lock as evaluation; do not overwrite a concurrently refreshed metric.
    await db.$queryRaw`SELECT 1::int FROM pg_advisory_xact_lock(hashtext(${'achievements:' + user.id}))`
    const rank = index + 1
    await db.$executeRaw`
      UPDATE "achievement_state" SET "metrics" =
        "metrics" || jsonb_build_object('rank', LEAST(COALESCE(("metrics"->>'rank')::int, 2147483647), ${rank}))
        || ${JSON.stringify(champion && rank === 1 ? { champion: 1 } : {})}::jsonb
      WHERE "userId" = ${user.id}
    `
    await awardAchievements(db, user.id, { rank, ...(champion && rank === 1 ? { champion: 1 } : {}) })
  }
}
async function weeklyRanks(db: Prisma.TransactionClient, start: Date, end: Date) {
  const minutes = getEffectiveSessionMinutesSql('s')
  return db.$queryRaw<RankedFocusUser[]>(Prisma.sql`
    SELECT u."id", COALESCE(SUM(${minutes}), 0)::int AS "totalMinutes"
    FROM "users" u JOIN "pomodoro_sessions" s ON s."userId" = u."id"
    WHERE NOT u."isAnonymous" AND s."status" IN ('COMPLETED', 'CANCELLED')
      AND s."type" IN ('WORK', 'TIME_TRACKING')
      AND COALESCE(s."completedAt", s."endedAt", s."startedAt") >= ${start}
      AND COALESCE(s."completedAt", s."endedAt", s."startedAt") < ${end}
    GROUP BY u."id" HAVING SUM(${minutes}) > 0
    ORDER BY "totalMinutes" DESC, u."id" ASC LIMIT 100
  `)
}

/** Global minute cache, shared by browser sync and cron. No per-profile ranking
 * aggregation. Completed weeks are finalized exactly once. */
export async function refreshAchievementLeaderboard() {
  await prisma.$transaction(async tx => {
    const [lock] = await tx.$queryRaw<{ acquired: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtext('achievement-leaderboard')) AS acquired`
    if (!lock.acquired) return
    const [last] = await tx.$queryRaw<{ updatedAt: Date }[]>`SELECT "updatedAt" FROM "achievement_jobs" WHERE "key" = 'leaderboard'`
    if (last && Date.now() - last.updatedAt.getTime() < 60000) return
    const current = leaderboardWeek()
    await recordLeaderboardRanks(tx, await weeklyRanks(tx, current.start, current.end))
    const [deployed] = await tx.$queryRaw<{ updatedAt: Date }[]>`SELECT "updatedAt" FROM "achievement_jobs" WHERE "key" = 'deployed'`
    const finalized = await tx.$queryRaw<{ key: string }[]>`SELECT "key" FROM "achievement_jobs" WHERE "key" LIKE 'week:%'`
    const done = new Set(finalized.map(row => row.key))
    let week = leaderboardWeek(deployed.updatedAt), processed = 0
    while (week.end <= current.start && processed < 8) {
      const key = 'week:' + week.start.toISOString()
      if (!done.has(key)) {
        await recordLeaderboardRanks(tx, await weeklyRanks(tx, week.start, week.end), true)
        await tx.$executeRaw`INSERT INTO "achievement_jobs" ("key") VALUES (${key}) ON CONFLICT DO NOTHING`
        processed++
      }
      week = leaderboardWeek(week.end)
    }
    await tx.$executeRaw`INSERT INTO "achievement_jobs" ("key") VALUES ('leaderboard')
      ON CONFLICT ("key") DO UPDATE SET "updatedAt" = CURRENT_TIMESTAMP`
  }, { timeout: 60000 })
}
