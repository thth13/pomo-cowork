import { Prisma } from '@prisma/client'
import { memoryFacts } from '@/lib/beepMemory'
import { prisma } from '@/lib/db'
import { getEffectiveSessionMinutesSql } from '@/lib/sessionStatsSql'

export function beepTimezone(value: unknown): string {
  if (typeof value !== 'string' || value.length > 80) return 'UTC'
  try { return new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone } catch { return 'UTC' }
}

const clip = (value: string | null, length: number) => value?.trim().slice(0, length) || null

export async function getBeepPersonalContext(userId: string, timezone: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: {
    beepMemory: { select: { facts: true, language: true } },
    isAnonymous: true, displayName: true, username: true, description: true,
    createdAt: true, lastSeenAt: true, experience: true, currentStreak: true, longestStreak: true,
  } })
  if (!user || user.isAnonymous) return null
  const now = new Date()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const attribution = Prisma.sql`COALESCE(s."completedAt", s."endedAt", s."startedAt", s."createdAt")`
  const effective = getEffectiveSessionMinutesSql('s')
  const [days, recent, lastCompleted] = await Promise.all([
    prisma.$queryRaw<{ day: string; focusMinutes: number; completedSessions: number; stoppedSessions: number }[]>(Prisma.sql`
      SELECT to_char((${attribution} AT TIME ZONE 'UTC') AT TIME ZONE ${timezone}, 'YYYY-MM-DD') AS day,
        COALESCE(SUM(${effective}), 0)::integer AS "focusMinutes",
        COUNT(*) FILTER (WHERE s.status = 'COMPLETED')::integer AS "completedSessions",
        COUNT(*) FILTER (WHERE s.status = 'CANCELLED')::integer AS "stoppedSessions"
      FROM pomodoro_sessions s
      WHERE s."userId" = ${userId} AND s.type IN ('WORK', 'TIME_TRACKING')
        AND s.status IN ('COMPLETED', 'CANCELLED')
        AND ${attribution} >= ((${today}::date - 29)::timestamp AT TIME ZONE ${timezone}) AT TIME ZONE 'UTC'
        AND ${attribution} <= ${now}
      GROUP BY day ORDER BY day DESC
    `),
    prisma.$queryRaw<{ at: Date; type: string; status: string; minutes: number; task: string; project: string | null }[]>(Prisma.sql`
      SELECT ${attribution} AS at, s.type, s.status, (${effective})::integer AS minutes,
        LEFT(s.task, 80) AS task, LEFT(s."projectName", 60) AS project
      FROM pomodoro_sessions s
      WHERE s."userId" = ${userId} AND s.type IN ('WORK', 'TIME_TRACKING')
        AND s.status IN ('COMPLETED', 'CANCELLED') AND ${attribution} <= ${now}
      ORDER BY ${attribution} DESC, s.id DESC LIMIT 3
    `),
    prisma.$queryRaw<{ at: Date }[]>(Prisma.sql`
      SELECT ${attribution} AS at FROM pomodoro_sessions s
      WHERE s."userId" = ${userId} AND s.type IN ('WORK', 'TIME_TRACKING')
        AND s.status = 'COMPLETED' AND ${attribution} <= ${now}
      ORDER BY ${attribution} DESC, s.id DESC LIMIT 1
    `),
  ])
  const cutoff = (daysAgo: number) => {
    const date = new Date(`${today}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() - daysAgo)
    return date.toISOString().slice(0, 10)
  }
  const period = (start: string, end = today) => {
    const selected = days.filter(day => day.day >= start && day.day <= end)
    return {
      focusMinutes: selected.reduce((sum, day) => sum + day.focusMinutes, 0),
      completedSessions: selected.reduce((sum, day) => sum + day.completedSessions, 0),
      stoppedSessions: selected.reduce((sum, day) => sum + day.stoppedSessions, 0),
      activeDays: selected.filter(day => day.focusMinutes > 0).length,
    }
  }
  const last7Days = period(cutoff(6))
  const previous7Days = period(cutoff(13), cutoff(7))
  return {
    asOf: now.toISOString(), timezone,
    memory: { language: user.beepMemory?.language ?? null, facts: memoryFacts(user.beepMemory?.facts).filter(fact => fact.value !== null).map(({ key, value }) => ({ key, value })) },
    profile: {
      name: clip(user.displayName || user.username, 60), description: clip(user.description, 240),
      joinedAt: user.createdAt.toISOString().slice(0, 10), experience: user.experience,
      currentStreak: user.currentStreak, longestStreak: user.longestStreak,
      lastRecordedActivityAt: user.lastSeenAt?.toISOString() ?? null,
    },
    activity: {
      today: period(today), last7Days, previous7Days, last30Days: period(cutoff(29)),
      weeklyFocusChangeMinutes: last7Days.focusMinutes - previous7Days.focusMinutes,
      lastCompletedSessionAt: lastCompleted[0]?.at.toISOString() ?? null,
      recentSessions: recent.map(session => ({ ...session, at: session.at.toISOString() })),
    },
  }
}

export type BeepPersonalContext = NonNullable<Awaited<ReturnType<typeof getBeepPersonalContext>>>

