import { shiftHabitDate, type Habit } from '@/lib/habits'

export type HabitStatisticsPeriod = 7 | 30 | 90

export function getHabitStatistics(habits: Habit[], today: string, period: HabitStatisticsPeriod) {
  const start = shiftHabitDate(today, 1 - period)
  const calendarStart = shiftHabitDate(today, -89)
  const active = habits.filter((habit) => !habit.archived).map((habit) => ({
    ...habit,
    dates: new Set(habit.completions
      .filter(({ date }) => date >= habit.startDate && date <= today)
      .map(({ date }) => date)),
  }))
  const days = Array.from({ length: 90 }, (_, index) => {
    const date = shiftHabitDate(calendarStart, index)
    const scheduled = active.filter((habit) => habit.startDate <= date)
    return {
      date,
      total: scheduled.length,
      completed: scheduled.filter((habit) => habit.dates.has(date)).length,
    }
  })
  const periodDays = days.slice(-period)
  const scheduled = periodDays.reduce((sum, day) => sum + day.total, 0)
  const completed = periodDays.reduce((sum, day) => sum + day.completed, 0)
  const ranking = active.map((habit) => {
    let streak = 0
    let bestStreak = 0
    let count = 0
    let total = 0
    for (const day of periodDays) {
      if (day.date < habit.startDate) continue
      total++
      if (habit.dates.has(day.date)) {
        count++
        streak++
        bestStreak = Math.max(bestStreak, streak)
      } else streak = 0
    }
    return { id: habit.id, title: habit.title, completed: count, total, rate: total ? count / total : null, bestStreak }
  }).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || b.completed - a.completed)

  return {
    start,
    days,
    scheduled,
    completed,
    rate: scheduled ? completed / scheduled : null,
    perfectDays: periodDays.filter((day) => day.total > 0 && day.completed === day.total).length,
    bestStreak: ranking.reduce((best, habit) => Math.max(best, habit.bestStreak), 0),
    ranking,
  }
}
