import { type AchievementMetrics } from './definitions'
import { getEffectiveMinutes } from '../sessionStats'

export interface AchievementSession {
  id: string
  type: string
  status: string
  duration: number
  startedAt: Date
  completedAt: Date | null
  endedAt: Date | null
  projectId: string | null
  remainingSeconds?: number | null
  pausedAt?: Date | null
}
export interface AchievementEvent {
  key: string
  kind: string
  createdAt: Date
  data: { peers?: string[]; room?: boolean }
}
export interface AchievementStatistics {
  metrics: AchievementMetrics
  projectId: string | null
}
const DAY = 86400000
function dateKey(date: Date, formatter: Intl.DateTimeFormat) {
  const parts = formatter.formatToParts(date)
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-')
}
function monday(day: string) {
  const date = new Date(day + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7)
  return date.toISOString().slice(0, 10)
}
function longestRun(totals: Map<string, number>, threshold: number, interval = DAY) {
  let longest = 0, run = 0, previous = -Infinity
  Array.from(totals.entries()).sort(([a], [b]) => a.localeCompare(b)).forEach(([key, value]) => {
    const timestamp = Date.parse(key + 'T00:00:00Z')
    run = value >= threshold ? (timestamp - previous === interval ? run + 1 : 1) : 0
    previous = timestamp
    longest = Math.max(longest, run)
  })
  return longest
}

/** One reusable pass; no database calls or clock-dependent unlocks. Calendar
 * totals belong to the completion day, matching existing statistics. */
export function buildAchievementStatistics(
  sessions: AchievementSession[], events: AchievementEvent[], completedTasks: number, timezone: string,
): AchievementStatistics {
  const dates = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const hours = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', hourCycle: 'h23' })
  const days = new Map<string, number>(), weeks = new Map<string, number>()
  const weekDays = new Map<string, Set<string>>(), projects = new Map<string, number>()
  const metrics: AchievementMetrics = { tasks: completedTasks }
  let totalMinutes = 0
  let lastActivity: Date | null = null
  const ordered = [...sessions].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
  for (const session of ordered) {
    if (!['WORK', 'TIME_TRACKING'].includes(session.type)) continue
    const end = session.completedAt ?? session.endedAt
    const completed = session.status === 'COMPLETED' && end && session.duration > 0 && end >= session.startedAt
    if (completed && end) {
      const day = dateKey(end, dates), week = monday(day)
      const minutes = getEffectiveMinutes(session)
      days.set(day, (days.get(day) ?? 0) + minutes)
      weeks.set(week, (weeks.get(week) ?? 0) + minutes)
      if (!weekDays.has(week)) weekDays.set(week, new Set())
      weekDays.get(week)!.add(day)
      totalMinutes += minutes
      if (session.type === 'WORK') metrics.sessions = (metrics.sessions ?? 0) + 1
      if (session.projectId) projects.set(session.projectId, (projects.get(session.projectId) ?? 0) + minutes)
      const hour = Number(hours.format(end))
      if (hour < 4) metrics.night = 1
      if (hour < 7) metrics.early = 1
      if (day.endsWith('-12-25')) metrics.christmas = 1
      if (day.endsWith('-01-01')) metrics.newYear = 1
      if (lastActivity) {
        // Inactivity ends at the start, not at the end of a long session.
        metrics.awayDays = Math.max(metrics.awayDays ?? 0, Math.floor((session.startedAt.getTime() - lastActivity.getTime()) / DAY))
      }
    }
    const activityEnd = end ?? session.startedAt
    if (!lastActivity || activityEnd > lastActivity) lastActivity = activityEnd
  }
  metrics.focusHours = totalMinutes / 60
  metrics.streak = longestRun(days, 25)
  metrics.consistentDays = longestRun(days, 60)
  metrics.consistentWeeks = longestRun(weeks, 300, 7 * DAY)
  metrics.dayHours = Array.from(days.values()).reduce((best, value) => Math.max(best, value / 60), 0)
  metrics.weekHours = Array.from(weeks.values()).reduce((best, value) => Math.max(best, value / 60), 0)
  metrics.weekDays = Array.from(weekDays.values()).reduce((best, value) => Math.max(best, value.size), 0)
  let projectId: string | null = null
  projects.forEach((minutes, id) => {
    if (minutes / 60 > (metrics.projectHours ?? 0)) {
      metrics.projectHours = minutes / 60
      projectId = id
    }
  })
  let uninterrupted = 0
  const buddies = new Map<string, number>()
  for (const event of [...events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.key.localeCompare(b.key))) {
    if (event.kind === 'cancelled') uninterrupted = 0
    if (event.kind === 'one-more') metrics.oneMore = 1
    if (event.kind !== 'completed') continue
    uninterrupted++
    metrics.uninterrupted = Math.max(metrics.uninterrupted ?? 0, uninterrupted)
    const peers = new Set(event.data.peers ?? [])
    if (peers.size > 0) metrics.coworking = (metrics.coworking ?? 0) + 1
    metrics.peers = Math.max(metrics.peers ?? 0, peers.size)
    if (event.data.room) metrics.rooms = (metrics.rooms ?? 0) + 1
    peers.forEach(id => buddies.set(id, (buddies.get(id) ?? 0) + 1))
  }
  metrics.buddy = Array.from(buddies.values()).reduce((best, value) => Math.max(best, value), 0)
  return { metrics, projectId }
}
