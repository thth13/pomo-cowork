import { SessionStatus, SessionType, type PomodoroSession } from '@/types'

export interface Stats {
  totalPomodoros: number
  totalFocusMinutes: number
  currentStreak: number
  avgMinutesPerDay: number
  focusTimeThisMonth: number
  weeklyActivity: Array<{ date: string; pomodoros: number; minutes: number }>
  yearlyHeatmap: HeatmapDay[]
  heatmapPeriod: {
    selected: string
    availableYears: number[]
    totalMinutes: number
    activeDays: number
    bestDayMinutes: number
    rangeStart: string
    rangeEnd: string
  }
  monthlyBreakdown: Array<{ month: string; monthIndex: number; pomodoros: number; minutes: number }>
  lastSevenDaysTimeline: Array<{
    date: string
    dayLabel: string
    totalFocusMinutes: number
    totalPomodoros: number
    sessions: Array<{
      id: string
      type: string
      status: string
      task: string
      start: string
      end: string
      duration: number
    }>
  }>
  productivityTrends: {
    bestTime: { start: string; end: string; efficiency: number }
    bestDay: { name: string; avgPomodoros: string }
    avgSessionDuration: number
    weeklyTasks: { completed: number; total: number }
  }
  taskStats: {
    total: number
    completed: number
    pending: number
    completionRate: number
    byPriority: {
      critical: number
      high: number
      medium: number
      low: number
    }
    topByPomodoros: Array<{
      id: string
      title: string
      completedPomodoros: number
      plannedPomodoros: number
      completed: boolean
      priority: string
    }>
    estimationAccuracy: number
    totalPlannedPomodoros: number
    totalCompletedPomodoros: number
  }
  taskTimeDistribution: Array<{
    task: string
    minutes: number
  }>
  activityRange: {
    start: string
    end: string
  }
}

export interface HeatmapDay {
  week: number
  dayOfWeek: number
  pomodoros: number
  minutes: number
  date: string
}

// Sample data feeds the exact same blocks and charts as the Pro dashboard.
export function createClassicStatisticsPreview(language: string, now = new Date()) {
  const tasks = language === 'es'
    ? ['Trabajo profundo', 'Aprendizaje', 'Planificación', 'Trabajo creativo']
    : ['Deep work', 'Learning', 'Planning', 'Creative work']
  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const dayAt = (offset: number) => { const date = new Date(now); date.setDate(date.getDate() + offset); date.setHours(0, 0, 0, 0); return date }
  const yearlyHeatmap: HeatmapDay[] = Array.from({ length: 365 }, (_, index) => {
    const date = dayAt(index - 364)
    const pomodoros = index % 11 === 0 || index % 7 === 5 ? 0 : 2 + index % 6
    return { date: dateKey(date), week: Math.floor((index + dayAt(-364).getDay()) / 7), dayOfWeek: date.getDay(), pomodoros, minutes: pomodoros * 30 }
  })
  const lastSevenDaysTimeline = Array.from({ length: 7 }, (_, index) => {
    const date = dayAt(index - 6)
    const sessions = [9, 10, 13, 15].map((hour, sessionIndex) => {
      const start = new Date(date); start.setHours(hour, index % 3 * 10)
      const end = new Date(start.getTime() + 30 * 60_000)
      return { id: `preview-${index}-${sessionIndex}`, type: SessionType.WORK, status: SessionStatus.COMPLETED, task: tasks[sessionIndex], start: start.toISOString(), end: end.toISOString(), duration: 30 }
    })
    return { date: dateKey(date), dayLabel: '', totalFocusMinutes: 120, totalPomodoros: 4, sessions }
  })
  const entries: PomodoroSession[] = lastSevenDaysTimeline.slice(-3).reverse().flatMap((day) => day.sessions.map((session) => ({
    id: session.id, userId: 'preview', task: session.task, duration: session.duration,
    type: SessionType.WORK, status: SessionStatus.COMPLETED,
    startedAt: session.start, endedAt: session.end, completedAt: session.end,
  })))
  const taskList = tasks.map((title, index) => ({ id: `preview-task-${index}`, title, completed: false, priority: 'MEDIUM', focusMinutes: [900, 600, 300, 200][index] }))
  const taskSessions = entries.filter((entry) => entry.task === tasks[0]).map((entry) => ({
    id: entry.id, task: entry.task, type: entry.type, status: entry.status, duration: entry.duration,
    startedAt: entry.startedAt, completedAt: entry.completedAt ?? null, effectiveMinutes: entry.duration,
  }))
  const stats: Stats = {
    totalPomodoros: 680, totalFocusMinutes: 20400, currentStreak: 5, avgMinutesPerDay: 120, focusTimeThisMonth: 2100,
    weeklyActivity: lastSevenDaysTimeline.map((day, index) => ({ date: day.date, pomodoros: 3 + index % 5, minutes: (3 + index % 5) * 30 })),
    yearlyHeatmap,
    heatmapPeriod: { selected: 'rolling', availableYears: [now.getFullYear()], totalMinutes: yearlyHeatmap.reduce((sum, day) => sum + day.minutes, 0), activeDays: yearlyHeatmap.filter((day) => day.minutes > 0).length, bestDayMinutes: 210, rangeStart: yearlyHeatmap[0].date, rangeEnd: dateKey(now) },
    monthlyBreakdown: Array.from({ length: 12 }, (_, monthIndex) => ({ month: String(monthIndex + 1), monthIndex, pomodoros: 35 + monthIndex * 3, minutes: (35 + monthIndex * 3) * 30 })),
    lastSevenDaysTimeline,
    productivityTrends: { bestTime: { start: '09:00', end: '11:00', efficiency: 86 }, bestDay: { name: 'Wednesday', avgPomodoros: '6' }, avgSessionDuration: 30, weeklyTasks: { completed: 24, total: 30 } },
    taskStats: { total: 30, completed: 24, pending: 6, completionRate: 80, byPriority: { critical: 2, high: 8, medium: 14, low: 6 }, topByPomodoros: [], estimationAccuracy: 90, totalPlannedPomodoros: 100, totalCompletedPomodoros: 90 },
    taskTimeDistribution: taskList.map((task) => ({ task: task.title, minutes: task.focusMinutes })),
    activityRange: { start: lastSevenDaysTimeline[0].date, end: dateKey(now) },
  }
  return { stats, entries, taskList, taskSessions }
}

