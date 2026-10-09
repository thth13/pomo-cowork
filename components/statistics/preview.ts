import { shiftDate, summarizeWeek, type FocusDay, type StatisticsData } from '@/lib/statistics'

// Demonstration data only; never substitutes for the user's real summary.
export function createStatisticsPreview(data: StatisticsData, tasks: readonly string[]): StatisticsData {
  const days: FocusDay[] = Array.from({ length: 365 }, (_, index) => {
    const date = shiftDate(data.today, index - 364)
    const sessions = index % 11 === 0 || index % 7 === 5 ? 0 : 2 + index % 6
    return { date, sessions, completed: sessions, minutes: sessions * (25 + index % 3 * 5) }
  })
  const dayByDate = new Map(days.map((day) => [day.date, day]))
  const weekDays = (offset: number) => Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(data.weekStart, index + offset)
    return dayByDate.get(date) ?? { date, minutes: 0, sessions: 0, completed: 0 }
  })
  const week = weekDays(0)
  const previousWeek = weekDays(-7)
  const month = days.filter((day) => day.date.startsWith(data.today.slice(0, 7)))
  const totalMinutes = days.reduce((sum, day) => sum + day.minutes, 0)
  const totalSessions = days.reduce((sum, day) => sum + day.sessions, 0)
  const bestDay = days.reduce((best, day) => day.minutes > best.minutes ? day : best)
  const shares = [45, 30, 15, 10]
  return {
    ...data,
    summary: {
      ...data.summary, totalMinutes, totalSessions, completedSessions: totalSessions,
      thisWeek: summarizeWeek(week), lastWeek: summarizeWeek(previousWeek),
    },
    details: {
      days, week, previousWeek,
      month: { minutes: month.reduce((sum, day) => sum + day.minutes, 0), sessions: month.reduce((sum, day) => sum + day.sessions, 0) },
      dna: { periods: [52, 31, 14, 3], peakHour: 9, averageSession: 30, averageBreak: 5, bestWeekday: 2 },
      records: [
        { kind: 'session', value: 90, date: shiftDate(data.today, -3), isNew: false },
        { kind: 'day', value: bestDay.minutes, date: bestDay.date, isNew: false },
        { kind: 'streak', value: 12, date: shiftDate(data.today, -7), isNew: false },
        { kind: 'week', value: 1080, date: shiftDate(data.weekStart, -7), isNew: false },
      ],
      projects: tasks.map((name, index) => ({ name, share: shares[index], minutes: Math.round(totalMinutes * shares[index] / 100), sessions: Math.round(totalSessions * shares[index] / 100) })),
      timeline: [540, 580, 660, 810, 855].map((startMinute, index) => ({
        id: `preview-${index}`, task: tasks[index % tasks.length], minutes: 25,
        startMinute, endMinute: startMinute + 25,
        // UTC owns the sample timeline so its labels agree with the drawn blocks.
        start: `${data.today}T${String(Math.floor(startMinute / 60)).padStart(2, '0')}:${String(startMinute % 60).padStart(2, '0')}:00Z`,
        end: `${data.today}T${String(Math.floor((startMinute + 25) / 60)).padStart(2, '0')}:${String((startMinute + 25) % 60).padStart(2, '0')}:00Z`,
      })),
    },
    timezone: 'UTC',
  }
}
