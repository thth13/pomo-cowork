import { DEMO_TODAY, type DemoTask } from './projectDemoData'

export function shiftDemoDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export type DemoAllocation = { taskId: string; sessions: number }

/** A deterministic preview, with each 25-minute block fitting the daily budget. */
export function scheduleDemoTasks(tasks: DemoTask[], days: number, hours: number, redistribute = false) {
  const schedule: Record<string, DemoAllocation[]> = {}
  const capacity = Math.max(1, Math.floor(hours * 60 / 25))
  const pending = tasks.filter(task => !task.done).sort((a, b) => a.date.localeCompare(b.date))
  let cursor = DEMO_TODAY

  for (const task of pending) {
    let remaining = Math.max(0, task.sessions - task.completedSessions)
    if (!redistribute && task.date > cursor) cursor = task.date
    while (remaining > 0) {
      const weekday = (new Date(`${cursor}T12:00:00Z`).getUTCDay() + 6) % 7
      const used = (schedule[cursor] || []).reduce((sum, entry) => sum + entry.sessions, 0)
      if (weekday >= days || used >= capacity) {
        cursor = shiftDemoDate(cursor, 1)
        continue
      }
      const sessions = Math.min(remaining, capacity - used)
      schedule[cursor] = [...(schedule[cursor] || []), { taskId: task.id, sessions }]
      remaining -= sessions
    }
  }
  return schedule
}

export function rebalanceDemoTasks(tasks: DemoTask[], days: number, hours: number) {
  const schedule = scheduleDemoTasks(tasks, days, hours, true)
  const starts = new Map<string, string>()
  Object.keys(schedule).sort().forEach(date => schedule[date].forEach(entry => {
    if (!starts.has(entry.taskId)) starts.set(entry.taskId, date)
  }))
  return tasks.map(task => starts.has(task.id) ? { ...task, date: starts.get(task.id)! } : task)
}
