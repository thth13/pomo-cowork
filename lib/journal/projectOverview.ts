import 'server-only'
import { prisma } from '@/lib/db'
import { buildStatistics } from '@/lib/statistics'
import { getEffectiveMinutes, getSessionAttributionDate } from '@/lib/sessionStats'

export async function projectOverview(project: { id: string; userId: string; workProjectId: string | null; showTasks: boolean }, page: number) {
  const taskWhere = { userId: project.userId, parentId: project.workProjectId || '__unlinked__' }
  const [sessions, totalTasks, completedTasks, tasks, followers] = await Promise.all([
    prisma.pomodoroSession.findMany({
      where: {
        userId: project.userId,
        OR: [{ projectId: project.id }, ...(project.workProjectId ? [{ workProjectId: project.workProjectId }] : [])],
        type: { in: ['WORK', 'TIME_TRACKING'] },
        status: { in: ['COMPLETED', 'CANCELLED'] },
      },
      select: { id: true, type: true, status: true, duration: true, startedAt: true, completedAt: true, endedAt: true, pausedAt: true, remainingSeconds: true },
      orderBy: { startedAt: 'desc' },
    }),
    prisma.task.count({ where: taskWhere }),
    prisma.task.count({ where: { ...taskWhere, completed: true } }),
    project.showTasks ? prisma.task.findMany({ where: taskWhere, select: { id: true, title: true, completed: true }, orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }], take: 21, skip: (page - 1) * 20 }) : [],
    prisma.projectFollow.count({ where: { projectId: project.id } }),
  ])
  const valid = sessions.filter(s => getEffectiveMinutes(s) > 0 && getSessionAttributionDate(s) <= new Date())
  const stats = buildStatistics(valid.map(s => ({ ...s, task: '' })), 0, 'UTC')
  return {
    totalTasks, completedTasks, tasks: tasks.slice(0, 20), moreTasks: tasks.length > 20, followers,
    seconds: stats.summary.totalMinutes * 60,
    sessions: stats.summary.totalSessions,
    pomodoros: valid.filter(s => s.type === 'WORK' && s.status === 'COMPLETED').length,
    streak: stats.summary.currentStreak,
    week: stats.details?.week ?? [],
    days: (stats.details?.days ?? []).map(d => ({ date: d.date, seconds: d.minutes * 60, sessions: d.sessions })),
    recent: valid.slice(0, 8).map(s => ({ id: s.id, date: getSessionAttributionDate(s).toISOString(), minutes: getEffectiveMinutes(s), type: s.type })),
  }
}
export type ProjectOverview = Awaited<ReturnType<typeof projectOverview>>
