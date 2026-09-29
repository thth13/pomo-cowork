import { getEffectiveMinutes, getSessionAttributionDate, getSessionEnd, type SessionForStats } from '@/lib/sessionStats'
import { getRankProgress } from '@/lib/ranks'

export interface StatisticsSession extends SessionForStats {
  id: string
  type: string
  status: string
  task: string
}

export interface FocusDay { date: string; minutes: number; sessions: number; completed: number }
export interface FocusWeek { minutes: number; sessions: number; completed: number; activeDays: number; average: number; score: number }
export interface FocusProject { name: string | null; minutes: number; sessions: number; share: number; other?: boolean }
export interface FocusRecord { kind: 'session' | 'day' | 'streak' | 'week'; value: number; date: string | null; isNew: boolean }
export interface FocusTimelineSession { id: string; task: string; start: string; end: string; startMinute: number; endMinute: number; minutes: number }
export interface StatisticsDetails {
  days: FocusDay[]
  week: FocusDay[]
  previousWeek: FocusDay[]
  month: { minutes: number; sessions: number }
  dna: { periods: number[]; peakHour: number | null; averageSession: number; averageBreak: number | null; bestWeekday: number | null }
  records: FocusRecord[]
  projects: FocusProject[]
  timeline: FocusTimelineSession[]
}
export interface StatisticsData {
  source: 'sessions'
  generatedAt: string
  timezone: string
  today: string
  weekStart: string
  access: 'basic' | 'pro'
  summary: {
    totalMinutes: number
    totalSessions: number
    completedSessions: number
    currentStreak: number
    thisWeek: FocusWeek
    lastWeek: FocusWeek
    rank: ReturnType<typeof getRankProgress>
  }
  details: StatisticsDetails | null
}

// Calendar arithmetic uses UTC on date-only keys; the user's IANA zone owns attribution.
export const shiftDate = (key: string, days: number) => {
  const date = new Date(`${key}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
const weekday = (key: string) => (new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7
const weekStart = (key: string) => shiftDate(key, -weekday(key))
const emptyDay = (date: string): FocusDay => ({ date, minutes: 0, sessions: 0, completed: 0 })

export function summarizeWeek(days: FocusDay[]): FocusWeek {
  const minutes = days.reduce((sum, day) => sum + day.minutes, 0)
  const sessions = days.reduce((sum, day) => sum + day.sessions, 0)
  const completed = days.reduce((sum, day) => sum + day.completed, 0)
  const activeDays = days.filter((day) => day.minutes > 0).length
  return {
    minutes, sessions, completed, activeDays,
    average: sessions ? Math.round(minutes / sessions) : 0,
    // A transparent habit indicator, not a clinical/productivity assessment.
    score: sessions ? Math.round(60 * activeDays / 7 + 40 * completed / sessions) : 0,
  }
}

export function buildStatistics(sessions: StatisticsSession[], experience: number, timezone: string, now = new Date()): StatisticsData {
  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const timeFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const dateKey = (date: Date) => {
    const parts = dateFormatter.formatToParts(date)
    return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)!.value).join('-')
  }
  const minuteOfDay = (date: Date) => {
    const [hour, minute] = timeFormatter.format(date).split(':').map(Number)
    return hour * 60 + minute
  }
  const today = dateKey(now)
  const monday = weekStart(today)
  const daily = new Map<string, FocusDay>()
  const projects = new Map<string, FocusProject>()
  const hours = Array<number>(24).fill(0)
  const weekdays = Array<number>(7).fill(0)
  const periods = [0, 0, 0, 0] // 06–12, 12–18, 18–24, 00–06; night is never hidden.
  const timeline: FocusTimelineSession[] = []
  let totalMinutes = 0, totalSessions = 0, completedSessions = 0, breakMinutes = 0, breaks = 0
  let longestSession = 0, longestSessionDate: string | null = null, previousLongestSession = 0

  for (const session of sessions) {
    if (session.status !== 'COMPLETED' && session.status !== 'CANCELLED') continue
    const start = session.startedAt instanceof Date ? session.startedAt : new Date(session.startedAt)
    const date = getSessionAttributionDate(session)
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(date.getTime()) || date > now) continue
    const minutes = getEffectiveMinutes(session)
    if (!Number.isFinite(minutes) || minutes <= 0) continue
    if (session.type === 'SHORT_BREAK' || session.type === 'LONG_BREAK') {
      breakMinutes += minutes
      breaks++
      continue
    }
    if (session.type !== 'WORK' && session.type !== 'TIME_TRACKING') continue
    const completed = session.status === 'COMPLETED' || session.type === 'TIME_TRACKING'
    const key = dateKey(date)
    const day = daily.get(key) ?? emptyDay(key)
    day.minutes += minutes
    day.sessions++
    day.completed += Number(completed)
    daily.set(key, day)
    totalMinutes += minutes
    totalSessions++
    completedSessions += Number(completed)
    const hour = Math.floor(minuteOfDay(start) / 60)
    hours[hour] += minutes
    periods[hour < 6 ? 3 : hour < 12 ? 0 : hour < 18 ? 1 : 2] += minutes
    weekdays[weekday(key)] += minutes
    const name = session.task.trim()
    const project = projects.get(name) ?? { name: name || null, minutes: 0, sessions: 0, share: 0 }
    project.minutes += minutes
    project.sessions++
    projects.set(name, project)
    if (minutes > longestSession) { longestSession = minutes; longestSessionDate = key }
    if (key < monday) previousLongestSession = Math.max(previousLongestSession, minutes)

    const end = getSessionEnd(session) ?? new Date(start.getTime() + minutes * 60_000)
    // Span shows the actual recorded window, including pauses. Midnight sessions are clipped.
    if (dateKey(start) <= today && dateKey(end) >= today && end > start) {
      timeline.push({
        id: session.id, task: session.task, start: start.toISOString(), end: end.toISOString(), minutes,
        startMinute: dateKey(start) < today ? 0 : minuteOfDay(start),
        endMinute: dateKey(end) > today ? 1440 : minuteOfDay(end),
      })
    }
  }

  const activeDates = Array.from(daily.keys()).sort()
  let longestStreak = 0, run = 0, lastDate: string | null = null, streakDate: string | null = null, previousLongestStreak = 0
  for (const key of activeDates) {
    run = lastDate && shiftDate(lastDate, 1) === key ? run + 1 : 1
    if (run > longestStreak) { longestStreak = run; streakDate = key }
    if (key < monday) previousLongestStreak = Math.max(previousLongestStreak, run)
    lastDate = key
  }
  let currentStreak = 0
  let cursor = daily.has(today) ? today : shiftDate(today, -1)
  while (daily.has(cursor)) { currentStreak++; cursor = shiftDate(cursor, -1) }
  const weeklyTotals = new Map<string, number>()
  let bestDay: FocusDay | null = null, previousBestDay = 0
  for (const day of Array.from(daily.values())) {
    if (!bestDay || day.minutes > bestDay.minutes) bestDay = day
    if (day.date < monday) previousBestDay = Math.max(previousBestDay, day.minutes)
    const start = weekStart(day.date)
    weeklyTotals.set(start, (weeklyTotals.get(start) ?? 0) + day.minutes)
  }
  const bestWeek = Array.from(weeklyTotals.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  const previousBestWeek = Array.from(weeklyTotals.entries()).reduce((best, [date, minutes]) => date < monday ? Math.max(best, minutes) : best, 0)
  const week = Array.from({ length: 7 }, (_, i) => daily.get(shiftDate(monday, i)) ?? emptyDay(shiftDate(monday, i)))
  const previousWeek = Array.from({ length: 7 }, (_, i) => daily.get(shiftDate(monday, i - 7)) ?? emptyDay(shiftDate(monday, i - 7)))
  const monthDays = Array.from(daily.values()).filter((day) => day.date.startsWith(today.slice(0, 7)))
  const sortedProjects = Array.from(projects.values()).sort((a, b) => b.minutes - a.minutes)
  const visibleProjects = sortedProjects.slice(0, 5)
  if (sortedProjects.length > 5) visibleProjects.push({ name: null, other: true, minutes: sortedProjects.slice(5).reduce((sum, p) => sum + p.minutes, 0), sessions: sortedProjects.slice(5).reduce((sum, p) => sum + p.sessions, 0), share: 0 })
  const twoHourTotals = hours.map((minutes, hour) => minutes + hours[(hour + 1) % 24])

  return {
    source: 'sessions', generatedAt: now.toISOString(), timezone, today, weekStart: monday, access: 'pro',
    summary: { totalMinutes, totalSessions, completedSessions, currentStreak, thisWeek: summarizeWeek(week), lastWeek: summarizeWeek(previousWeek), rank: getRankProgress(experience) },
    details: {
      days: Array.from({ length: 365 }, (_, i) => { const date = shiftDate(today, i - 364); return daily.get(date) ?? emptyDay(date) }),
      week, previousWeek,
      month: { minutes: monthDays.reduce((sum, day) => sum + day.minutes, 0), sessions: monthDays.reduce((sum, day) => sum + day.sessions, 0) },
      dna: { periods, peakHour: totalMinutes ? twoHourTotals.indexOf(Math.max(...twoHourTotals)) : null, averageSession: totalSessions ? Math.round(totalMinutes / totalSessions) : 0, averageBreak: breaks ? Math.round(breakMinutes / breaks) : null, bestWeekday: totalMinutes ? weekdays.indexOf(Math.max(...weekdays)) : null },
      records: [
        { kind: 'session', value: longestSession, date: longestSessionDate, isNew: longestSession > previousLongestSession && previousLongestSession > 0 },
        { kind: 'day', value: bestDay?.minutes ?? 0, date: bestDay?.date ?? null, isNew: (bestDay?.minutes ?? 0) > previousBestDay && previousBestDay > 0 },
        { kind: 'streak', value: longestStreak, date: streakDate, isNew: longestStreak > previousLongestStreak && previousLongestStreak > 0 },
        { kind: 'week', value: bestWeek?.[1] ?? 0, date: bestWeek?.[0] ?? null, isNew: (bestWeek?.[1] ?? 0) > previousBestWeek && previousBestWeek > 0 },
      ],
      projects: visibleProjects.map((project) => ({ ...project, share: totalMinutes ? project.minutes / totalMinutes * 100 : 0 })),
      timeline: timeline.sort((a, b) => a.start.localeCompare(b.start)),
    },
  }
}
