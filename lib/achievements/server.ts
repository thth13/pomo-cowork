import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ENABLED_ACHIEVEMENTS, isEarned, type AchievementMetrics, type AchievementProfile } from './definitions'
import { buildAchievementStatistics, type AchievementEvent } from './engine'

type DB = Prisma.TransactionClient
interface State { timezone: string; version: number; evaluatedVersion: number; metrics: AchievementMetrics; evaluatedAt: Date | null }
interface Unlock { achievementId: string; unlockedAt: Date }
export async function awardAchievements(db: DB, userId: string, metrics: AchievementMetrics, metadata: Record<string, string> = {}) {
  const earned = ENABLED_ACHIEVEMENTS.filter(d => isEarned(d, metrics))
  if (!earned.length) return
  await db.$executeRaw(Prisma.sql`
    INSERT INTO "user_achievements" ("userId", "achievementId", "metadata")
    VALUES ${Prisma.join(earned.map(d => Prisma.sql`(${userId}, ${d.id}, ${JSON.stringify(d.category === 'projects' ? metadata : {})}::jsonb)`))}
    ON CONFLICT ("userId", "achievementId") DO NOTHING
  `)
}

/** Dirty versions are written atomically by database triggers. A failed
 * evaluation stays dirty and is retried by sync or the scheduled worker. */
export async function evaluateAchievements(userId: string, timezone?: string, force = false) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1::int FROM pg_advisory_xact_lock(hashtext(${'achievements:' + userId}))`
    await tx.$executeRaw`INSERT INTO "achievement_state" ("userId") VALUES (${userId}) ON CONFLICT DO NOTHING`
    if (timezone) await tx.$executeRaw`
      UPDATE "achievement_state" SET "timezone" = ${timezone}, "version" = "version" + 1
      WHERE "userId" = ${userId} AND "timezone" <> ${timezone}
    `
    const [state] = await tx.$queryRaw<State[]>`SELECT * FROM "achievement_state" WHERE "userId" = ${userId}`
    if (!force && state.version === state.evaluatedVersion) return
    const [sessions, events, taskCounts] = await Promise.all([
      tx.pomodoroSession.findMany({
        where: { userId, type: { in: ['WORK', 'TIME_TRACKING'] } },
        select: { id: true, type: true, status: true, duration: true, startedAt: true, completedAt: true, endedAt: true, projectId: true, remainingSeconds: true, pausedAt: true },
        orderBy: { startedAt: 'asc' },
      }),
      tx.$queryRaw<AchievementEvent[]>`SELECT "key", "kind", "data", "createdAt" FROM "achievement_events"
        WHERE "userId" = ${userId} AND "kind" <> 'task-completed' ORDER BY "createdAt", "key"`,
      tx.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM (
          SELECT "key" FROM "achievement_events" WHERE "userId" = ${userId} AND "kind" = 'task-completed'
          UNION SELECT 'task:' || "id" FROM "tasks" WHERE "userId" = ${userId} AND "completed"
        ) completed_tasks
      `,
    ])
    const { metrics, projectId } = buildAchievementStatistics(sessions, events, taskCounts[0].count, state.timezone)
    // Rankings are recorded independently by the shared leaderboard worker.
    metrics.rank = state.metrics.rank
    metrics.champion = state.metrics.champion
    const project = projectId ? await tx.project.findFirst({ where: { id: projectId, userId }, select: { id: true, name: true } }) : null
    await awardAchievements(tx, userId, metrics, project ? { projectId: project.id, projectName: project.name } : {})
    await tx.$executeRaw`UPDATE "achievement_state"
      SET "metrics" = ${JSON.stringify(metrics)}::jsonb, "evaluatedVersion" = ${state.version}, "evaluatedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = ${userId}`
  }, { timeout: 30000 })
}

export async function getAchievementProfile(userId: string, owner: boolean): Promise<AchievementProfile> {
  const [unlocks, states, population] = await Promise.all([
    prisma.$queryRaw<Unlock[]>`SELECT "achievementId", "unlockedAt" FROM "user_achievements" WHERE "userId" = ${userId}`,
    prisma.$queryRaw<State[]>`SELECT * FROM "achievement_state" WHERE "userId" = ${userId}`,
    prisma.$queryRaw<{ achievementId: string; percentage: number }[]>`
      SELECT "achievementId", ROUND(100.0 * "unlockedCount" / NULLIF("eligibleCount", 0), 1)::float AS percentage
      FROM "achievement_population" WHERE "eligibleCount" > 0 AND "updatedAt" > CURRENT_TIMESTAMP - INTERVAL '2 days'
    `,
  ])
  const state = states[0]
  return {
    evaluatedAt: state?.evaluatedAt?.toISOString() ?? null,
    items: ENABLED_ACHIEVEMENTS.map(d => {
      const unlock = unlocks.find(row => row.achievementId === d.id)
      const hidden = d.secret && !unlock
      return {
        id: d.id, category: d.category, rarity: d.rarity, icon: d.icon,
        name: hidden ? 'Secret Achievement' : d.name,
        nameEs: hidden ? 'Logro secreto' : d.nameEs,
        description: hidden ? '' : d.description,
        descriptionEs: hidden ? '' : d.descriptionEs,
        secret: !!d.secret, threshold: hidden ? null : d.threshold, unit: hidden ? 'count' : d.unit,
        // Private task/project totals and locked progress never leave owner APIs.
        progress: !owner || d.secret ? null : (state?.metrics[d.metric] ?? 0),
        unlockedAt: unlock?.unlockedAt.toISOString() ?? null,
        percentage: hidden ? null : population.find(p => p.achievementId === d.id)?.percentage ?? null,
      }
    }),
  }
}
