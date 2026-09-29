export interface Habit {
  id: string
  title: string
  startDate: string
  archived: boolean
  completions: { date: string }[]
}

// Date-only keys follow the user's local calendar, never UTC conversion.
export function habitDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function shiftHabitDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return habitDate(value)
}

export function validHabitDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function habitStreak(habit: Habit, today: string): number {
  const dates = new Set(habit.completions.map(({ date }) => date))
  let day = dates.has(today) ? today : shiftHabitDate(today, -1)
  let streak = 0
  while (dates.has(day)) {
    streak++
    day = shiftHabitDate(day, -1)
  }
  return streak
}
