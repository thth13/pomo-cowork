import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getEffectiveSessionMinutesSql } from '@/lib/sessionStatsSql'

export async function listFocusProjects(userId: string) {
  const effectiveMinutes = getEffectiveSessionMinutesSql('s')
  const [tasks, rows] = await Promise.all([
    prisma.task.findMany({ where: { userId }, orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }] }),
    prisma.$queryRaw<{ workProjectId: string | null; taskRecordId: string | null; focusMinutes: number; lastWorkedAt: Date | null }[]>(Prisma.sql`
      SELECT "s"."workProjectId", "s"."taskRecordId",
        COALESCE(SUM(${effectiveMinutes}), 0)::integer AS "focusMinutes",
        MAX("s"."startedAt") FILTER (WHERE ${effectiveMinutes} > 0) AS "lastWorkedAt"
      FROM "pomodoro_sessions" AS "s"
      WHERE "s"."userId" = ${userId}
        AND "s"."type" IN ('WORK', 'TIME_TRACKING')
        AND "s"."status" IN ('COMPLETED', 'CANCELLED')
      GROUP BY "s"."workProjectId", "s"."taskRecordId"
    `),
  ])
  const projectMinutes = new Map<string, number>()
  const taskMinutes = new Map<string, number>()
  const projectActivity = new Map<string, Date>()
  const taskActivity = new Map<string, Date>()
  const recordActivity = (activity: Map<string, Date>, id: string | null, date: Date | null) => {
    if (id && date && (!activity.has(id) || date > activity.get(id)!)) activity.set(id, date)
  }
  for (const row of rows) {
    if (row.workProjectId) projectMinutes.set(row.workProjectId, (projectMinutes.get(row.workProjectId) ?? 0) + row.focusMinutes)
    if (row.taskRecordId) taskMinutes.set(row.taskRecordId, (taskMinutes.get(row.taskRecordId) ?? 0) + row.focusMinutes)
    recordActivity(projectActivity, row.workProjectId, row.lastWorkedAt)
    recordActivity(taskActivity, row.taskRecordId, row.lastWorkedAt)
  }
  const titles = new Map(tasks.filter(task => !task.parentId).map(task => [task.id, task.title]))
  return tasks.map(task => ({
    ...task,
    focusMinutes: (task.parentId ? taskMinutes : projectMinutes).get(task.id) ?? 0,
    lastWorkedAt: (task.parentId ? taskActivity : projectActivity).get(task.id)?.toISOString() ?? null,
    projectTitle: titles.get(task.parentId ?? task.id),
  }))
}
