import { prisma } from '@/lib/db'
import { evaluateAchievements } from './server'
import { refreshAchievementLeaderboard } from './leaderboard'

export async function runAchievementJobs(limit = 100) {
  const users = await prisma.$queryRaw<{ userId: string }[]>`
    SELECT s."userId" FROM "achievement_state" s JOIN "users" u ON u."id" = s."userId"
    WHERE s."version" <> s."evaluatedVersion" AND NOT u."isAnonymous"
    ORDER BY s."evaluatedAt" ASC NULLS FIRST, s."userId" LIMIT ${limit}
  `
  let evaluated = 0
  for (const user of users) {
    await evaluateAchievements(user.userId)
    evaluated++
  }
  await refreshAchievementLeaderboard()
  await prisma.$transaction(async tx => {
    const [lock] = await tx.$queryRaw<{ acquired: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtext('achievement-population')) AS acquired`
    if (!lock.acquired) return
    const [last] = await tx.$queryRaw<{ updatedAt: Date }[]>`SELECT "updatedAt" FROM "achievement_jobs" WHERE "key" = 'population'`
    if (last && Date.now() - last.updatedAt.getTime() < 86400000) return
    // Wait until the historical backfill is complete before publishing rates.
    const [pending] = await tx.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count
      FROM "achievement_state" s JOIN "users" u ON u."id" = s."userId"
      WHERE NOT u."isAnonymous" AND s."evaluatedAt" IS NULL`
    if (pending.count > 0) return
    await tx.$executeRaw`
      INSERT INTO "achievement_population" ("achievementId", "unlockedCount", "eligibleCount")
      SELECT a."achievementId", COUNT(*)::int, (SELECT COUNT(*)::int FROM "users" WHERE NOT "isAnonymous")
      FROM "user_achievements" a JOIN "users" u ON u."id" = a."userId"
      WHERE NOT u."isAnonymous" GROUP BY a."achievementId"
      ON CONFLICT ("achievementId") DO UPDATE SET "unlockedCount" = EXCLUDED."unlockedCount",
        "eligibleCount" = EXCLUDED."eligibleCount", "updatedAt" = CURRENT_TIMESTAMP
    `
    await tx.$executeRaw`INSERT INTO "achievement_jobs" ("key") VALUES ('population')
      ON CONFLICT ("key") DO UPDATE SET "updatedAt" = CURRENT_TIMESTAMP`
  })
  return { evaluated, hasMore: users.length === limit }
}
