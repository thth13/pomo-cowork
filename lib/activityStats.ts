import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, startOfWeek, endOfWeek, format, subMonths, subYears, subWeeks } from 'date-fns'
import { getEffectiveMinutes, getSessionAttributionDate, type SessionForStats } from '@/lib/sessionStats'

export function getActivityStats(allFocusSessions: SessionForStats[], period: string, activityOffset: number, now = new Date()) {
  // Активность за выбранный период с поддержкой смещения
  const daysCount = parseInt(period)
  const weeklyActivity = []
  let activityRangeStart = ''
  let activityRangeEnd = ''

  if (daysCount === 365) {
    // Для года - разбивка по месяцам
    const baseYear = subYears(now, activityOffset)
    const yearStart = startOfYear(baseYear)
    const yearEnd = activityOffset === 0 ? now : endOfDay(new Date(baseYear.getFullYear(), 11, 31))
    activityRangeStart = format(yearStart, 'yyyy-MM-dd')
    activityRangeEnd = format(yearEnd, 'yyyy-MM-dd')

    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(baseYear.getFullYear(), i, 1)
      const monthStartDate = startOfMonth(monthDate)
      const monthEndDate = endOfMonth(monthDate)

      const monthSessions = allFocusSessions.filter(session => {
        const sessionDate = getSessionAttributionDate(session)
        return sessionDate >= monthStartDate && sessionDate <= monthEndDate
      })

      weeklyActivity.push({
        date: format(monthDate, 'yyyy-MM'),
        pomodoros: monthSessions.filter(s => s.type === 'WORK').length,
        minutes: monthSessions.reduce((sum, s) => sum + getEffectiveMinutes(s), 0)
      })
    }
  } else if (daysCount === 30) {
    // Для месяца - разбивка по дням
    const baseMonth = subMonths(now, activityOffset)
    const rangeStart = startOfMonth(baseMonth)
    const rangeEnd = endOfMonth(baseMonth)
    activityRangeStart = format(rangeStart, 'yyyy-MM-dd')
    activityRangeEnd = format(rangeEnd, 'yyyy-MM-dd')

    let currentDay = rangeStart
    while (currentDay <= rangeEnd) {
      const dayStart = startOfDay(currentDay)
      const dayEnd = endOfDay(currentDay)

      const daySessions = allFocusSessions.filter(session => {
        const sessionDate = getSessionAttributionDate(session)
        return sessionDate >= dayStart && sessionDate <= dayEnd
      })

      weeklyActivity.push({
        date: format(currentDay, 'yyyy-MM-dd'),
        pomodoros: daySessions.filter(s => s.type === 'WORK').length,
        minutes: daySessions.reduce((sum, s) => sum + getEffectiveMinutes(s), 0)
      })
      currentDay = new Date(currentDay)
      currentDay.setDate(currentDay.getDate() + 1)
    }
  } else {
    // Для 7 дней (неделя) - Mon-Sun с поддержкой смещения
    const baseWeek = subWeeks(now, activityOffset)
    const rangeStart = startOfWeek(baseWeek, { weekStartsOn: 1 })
    const rangeEnd = endOfWeek(baseWeek, { weekStartsOn: 1 })
    activityRangeStart = format(rangeStart, 'yyyy-MM-dd')
    activityRangeEnd = format(rangeEnd, 'yyyy-MM-dd')

    for (let i = 0; i < 7; i++) {
      const date = new Date(rangeStart)
      date.setDate(rangeStart.getDate() + i)
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)

      const daySessions = allFocusSessions.filter(session => {
        const sessionDate = getSessionAttributionDate(session)
        return sessionDate >= dayStart && sessionDate <= dayEnd
      })

      weeklyActivity.push({
        date: format(date, 'yyyy-MM-dd'),
        pomodoros: daySessions.filter(s => s.type === 'WORK').length,
        minutes: daySessions.reduce((sum, s) => sum + getEffectiveMinutes(s), 0)
      })
    }
  }

  return { weeklyActivity, activityRange: { start: activityRangeStart, end: activityRangeEnd } }
}
