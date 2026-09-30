import { getEffectiveMinutes, getSessionEnd, type SessionForStats } from '@/lib/sessionStats'
import { shiftDate } from '@/lib/statistics'

export interface WrappedSession extends SessionForStats {
  project: { id: string; name: string } | null
}
export interface WeeklyWrapped {
  version: 1
  weekStart: string
  weekEnd: string
  timezone: string
  totalFocusMinutes: number
  completedSessions: number
  activeDays: number
  longestWeeklyStreak: number
  days: { date: string; focusMinutes: number; sessions: number }[]
  bestDay: { date: string; focusMinutes: number; sessions: number } | null
  favoriteFocusHour: number | null
  favoriteFocusPeriod: 'early' | 'morning' | 'afternoon' | 'night'
  topProject: { id: string; name: string; focusMinutes: number } | null
  previousWeek: { totalFocusMinutes: number; differenceMinutes: number; percentageChange: number } | null
  percentile: number | null
  communitySize: number
  longestSessionMinutes: number
  averageSessionMinutes: number
}
export function zonedDate(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-')
}
export function previousMonday(timezone: string, now = new Date()) {
  const today = zonedDate(now, timezone)
  return shiftDate(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7) - 7)
}
export function validWeek(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value && new Date(`${value}T12:00:00Z`).getUTCDay() === 1
}
// Match the existing statistics' completion-day attribution. A session is counted
// once, in full, on its local completion date, even across a week boundary.
export function buildWeeklyWrapped(sessions: WrappedSession[], weekStart: string, timezone: string): WeeklyWrapped {
  const days = Array.from({ length: 7 }, (_, i) => ({ date: shiftDate(weekStart, i), focusMinutes: 0, sessions: 0 }))
  const projects = new Map<string, NonNullable<WeeklyWrapped['topProject']>>()
  const hours = Array<number>(24).fill(0)
  const hourFormat = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', hourCycle: 'h23' })
  let previousMinutes = 0, longest = 0, completed = 0
  for (const session of sessions) {
    if (!['WORK', 'TIME_TRACKING'].includes(session.type ?? '') ||
      !(session.status === 'COMPLETED' || (session.type === 'TIME_TRACKING' && session.status === 'CANCELLED'))) continue
    const end = getSessionEnd(session)
    if (!end || !Number.isFinite(end.getTime())) continue
    const minutes = getEffectiveMinutes(session)
    if (!Number.isFinite(minutes) || minutes <= 0) continue
    const date = zonedDate(end, timezone)
    if (date >= shiftDate(weekStart, -7) && date < weekStart) previousMinutes += minutes
    const day = days.find(item => item.date === date)
    if (!day) continue
    day.focusMinutes += minutes
    day.sessions++
    completed++
    longest = Math.max(longest, minutes)
    const start = session.startedAt instanceof Date ? session.startedAt : new Date(session.startedAt)
    if (Number.isFinite(start.getTime())) hours[Number(hourFormat.format(start))]++
    if (session.project) {
      const project = projects.get(session.project.id) ?? { ...session.project, focusMinutes: 0 }
      project.focusMinutes += minutes
      projects.set(project.id, project)
    }
  }
  let streak = 0, longestStreak = 0
  for (const day of days) { streak = day.focusMinutes ? streak + 1 : 0; longestStreak = Math.max(longestStreak, streak) }
  const total = days.reduce((sum, day) => sum + day.focusMinutes, 0)
  const hour = completed ? hours.indexOf(Math.max(...hours)) : null
  return {
    version: 1, weekStart, weekEnd: shiftDate(weekStart, 6), timezone, days,
    totalFocusMinutes: total, completedSessions: completed, activeDays: days.filter(day => day.focusMinutes > 0).length,
    longestWeeklyStreak: longestStreak, bestDay: total ? [...days].sort((a, b) => b.focusMinutes - a.focusMinutes)[0] : null,
    favoriteFocusHour: hour, favoriteFocusPeriod: hour !== null && hour >= 5 && hour < 9 ? 'early' : hour !== null && hour >= 9 && hour < 12 ? 'morning' : hour !== null && hour >= 12 && hour < 18 ? 'afternoon' : 'night',
    topProject: Array.from(projects.values()).sort((a, b) => b.focusMinutes - a.focusMinutes || a.id.localeCompare(b.id))[0] ?? null,
    previousWeek: previousMinutes > 0 ? { totalFocusMinutes: previousMinutes, differenceMinutes: total - previousMinutes, percentageChange: Math.round((total - previousMinutes) / previousMinutes * 100) } : null,
    percentile: null, communitySize: 0, longestSessionMinutes: longest, averageSessionMinutes: completed ? Math.round(total / completed) : 0,
  }
}
export function focusDuration(minutes: number) {
  const whole = Math.round(minutes)
  return whole >= 60 ? `${Math.floor(whole / 60)}h ${whole % 60}m` : `${whole}m`
}
export function weekLabel(report: Pick<WeeklyWrapped, 'weekStart' | 'weekEnd'>, locale: string) {
  const format = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${format(report.weekStart)} — ${format(report.weekEnd)}`
}
