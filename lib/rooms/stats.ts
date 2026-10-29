import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getEffectiveSessionMinutesSql } from '@/lib/sessionStatsSql'
import type { RoomEngagementStats, RoomLeaderboard, RoomLeaderboardEntry, RoomLeaderboardPeriod } from '@/types/roomEngagement'

interface UserFocusTotals {
  id: string
  username: string
  avatarUrl: string | null
  allTimeMinutes: number
  weekMinutes: number
  todayMinutes: number
  allTimePomodoros: number
  weekPomodoros: number
  todayPomodoros: number
  activeDays: number
}

interface DailyFocusTotals {
  date: string
  minutes: number
  ownMinutes: number
  participants: number
}

const DAY_MS = 86_400_000
const dateKey = (date: Date) => date.toISOString().slice(0, 10)
const roundedHours = (minutes: number) => Math.round(minutes / 6) / 10
const contributionPercent = (minutes: number, total: number) => total > 0 ? Math.round(minutes / total * 1000) / 10 : 0

function currentStreak(activeDates: Set<string>, today: Date) {
  let cursor = today.getTime()
  // Yesterday's streak remains alive until today has finished.
  if (!activeDates.has(dateKey(new Date(cursor)))) cursor -= DAY_MS
  let streak = 0
  while (activeDates.has(dateKey(new Date(cursor)))) {
    streak += 1
    cursor -= DAY_MS
  }
  return streak
}

function leaderboard(users: UserFocusTotals[], period: RoomLeaderboardPeriod, userId: string | null): RoomLeaderboard {
  const minutesField = `${period}Minutes` as const
  const pomodorosField = `${period}Pomodoros` as const
  const sorted = users.filter(user => user[minutesField] > 0).sort((a, b) =>
    b[minutesField] - a[minutesField] || a.id.localeCompare(b.id)
  )
  const totalMinutes = sorted.reduce((total, user) => total + user[minutesField], 0)
  let previousMinutes = -1
  let rank = 0
  const entries: RoomLeaderboardEntry[] = sorted.map((user, index) => {
    // Equal focus time shares a rank; IDs keep display ordering deterministic.
    if (user[minutesField] !== previousMinutes) rank = index + 1
    previousMinutes = user[minutesField]
    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl ?? undefined,
      minutes: user[minutesField],
      pomodoros: user[pomodorosField],
      contributionPercent: contributionPercent(user[minutesField], totalMinutes),
      rank,
    }
  })
  return {
    entries: entries.slice(0, 20),
    totalParticipants: entries.length,
    totalMinutes,
    currentUser: entries.find(entry => entry.id === userId) ?? null,
  }
}

export async function getRoomEngagementStats(roomId: string, userId: string | null): Promise<RoomEngagementStats | null> {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const tomorrow = new Date(today.getTime() + DAY_MS)
  const weekStart = new Date(today.getTime() - ((today.getUTCDay() + 6) % 7) * DAY_MS)
  const attributedAt = Prisma.sql`COALESCE(s."completedAt", s."endedAt", s."startedAt", s."createdAt")`
  const focusRows = Prisma.sql`
    SELECT s."userId", s."type", s."status", ${attributedAt} AS "attributedAt",
      ${getEffectiveSessionMinutesSql('s')} AS minutes
    FROM "pomodoro_sessions" s
    WHERE s."roomId" = ${roomId}
      AND s."status" IN ('COMPLETED', 'CANCELLED')
      AND s."type" IN ('WORK', 'TIME_TRACKING')
      AND ${attributedAt} <= ${now}
  `

  // Aggregate in PostgreSQL rather than transferring every historical session.
  // Prisma timestamps are stored in UTC; day keys are independent of the host timezone.
  // Keep the rankings, day chart and goal eligibility on one database snapshot.
  const [users, days, members, savedChallenge, room] = await prisma.$transaction([
    prisma.$queryRaw<UserFocusTotals[]>(Prisma.sql`
      WITH focus AS (${focusRows})
      SELECT u."id", u."username", u."avatarUrl",
        SUM(f.minutes)::float8 AS "allTimeMinutes",
        COALESCE(SUM(f.minutes) FILTER (WHERE f."attributedAt" >= ${weekStart}), 0)::float8 AS "weekMinutes",
        COALESCE(SUM(f.minutes) FILTER (WHERE f."attributedAt" >= ${today}), 0)::float8 AS "todayMinutes",
        COUNT(*) FILTER (WHERE f."type" = 'WORK' AND f."status" = 'COMPLETED')::int AS "allTimePomodoros",
        COUNT(*) FILTER (WHERE f."type" = 'WORK' AND f."status" = 'COMPLETED' AND f."attributedAt" >= ${weekStart})::int AS "weekPomodoros",
        COUNT(*) FILTER (WHERE f."type" = 'WORK' AND f."status" = 'COMPLETED' AND f."attributedAt" >= ${today})::int AS "todayPomodoros",
        COUNT(DISTINCT TO_CHAR(f."attributedAt", 'YYYY-MM-DD'))::int AS "activeDays"
      FROM focus f JOIN "users" u ON u."id" = f."userId"
      WHERE f.minutes > 0
      GROUP BY u."id", u."username", u."avatarUrl"
    `),
    prisma.$queryRaw<DailyFocusTotals[]>(Prisma.sql`
      WITH focus AS (${focusRows})
      SELECT TO_CHAR(f."attributedAt", 'YYYY-MM-DD') AS date,
        SUM(f.minutes)::float8 AS minutes,
        COALESCE(SUM(f.minutes) FILTER (WHERE f."userId" = ${userId}), 0)::float8 AS "ownMinutes",
        COUNT(DISTINCT f."userId")::int AS participants
      FROM focus f WHERE f.minutes > 0
      GROUP BY TO_CHAR(f."attributedAt", 'YYYY-MM-DD')
      ORDER BY date ASC
    `),
    prisma.roomMember.findMany({ where: { roomId }, select: { userId: true } }),
    prisma.roomChallenge.findUnique({ where: { roomId } }),
    prisma.room.findUnique({ where: { id: roomId }, select: { ownerId: true, privacy: true } }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })

  // Ownership and membership must come from the same snapshot, including when
  // the previous owner leaves between the initial access check and this read.
  if (!room || (room.privacy === 'PRIVATE' && room.ownerId !== userId && !members.some(member => member.userId === userId))) return null

  const leaderboards = {
    today: leaderboard(users, 'today', userId),
    week: leaderboard(users, 'week', userId),
    allTime: leaderboard(users, 'allTime', userId),
  }
  const totalFocusMinutes = leaderboards.allTime.totalMinutes
  const totalPomodoros = users.reduce((total, user) => total + user.allTimePomodoros, 0)
  const daysByDate = new Map(days.map(day => [day.date, day]))
  const ownTotals = users.find(user => user.id === userId)
  const eligibleIds = new Set([room.ownerId, ...members.map(member => member.userId)])
  const isParticipant = userId !== null && eligibleIds.has(userId)
  const achievers = savedChallenge
    ? users.filter(user => eligibleIds.has(user.id) && user.todayMinutes >= savedChallenge.targetMinutes)
      .sort((a, b) => b.todayMinutes - a.todayMinutes || a.id.localeCompare(b.id))
    : []

  return {
    timezone: 'UTC',
    generatedAt: now.toISOString(),
    dayEndsAt: tomorrow.toISOString(),
    totalPomodoros,
    totalFocusMinutes,
    totalFocusHours: roundedHours(totalFocusMinutes),
    avgDailyFocusMinutes: days.length > 0 ? Math.round(totalFocusMinutes / days.length) : 0,
    todayFocusMinutes: leaderboards.today.totalMinutes,
    todayParticipants: leaderboards.today.totalParticipants,
    roomStreak: currentStreak(new Set(days.map(day => day.date)), today),
    weeklyActivity: Array.from({ length: 7 }, (_, index) => {
      const date = dateKey(new Date(today.getTime() - (6 - index) * DAY_MS))
      const day = daysByDate.get(date)
      return {
        date,
        hours: roundedHours(day?.minutes ?? 0),
        minutes: day?.minutes ?? 0,
        ownMinutes: day?.ownMinutes ?? 0,
        participants: day?.participants ?? 0,
      }
    }),
    topUsers: leaderboards.allTime.entries.slice(0, 10).map(entry => ({
      id: entry.id,
      username: entry.username,
      avatarUrl: entry.avatarUrl,
      hours: roundedHours(entry.minutes),
      contributionPercent: entry.contributionPercent,
    })),
    leaderboards,
    personal: userId ? {
      todayMinutes: ownTotals?.todayMinutes ?? 0,
      weekMinutes: ownTotals?.weekMinutes ?? 0,
      allTimeMinutes: ownTotals?.allTimeMinutes ?? 0,
      todayPomodoros: ownTotals?.todayPomodoros ?? 0,
      totalPomodoros: ownTotals?.allTimePomodoros ?? 0,
      contributionPercent: contributionPercent(ownTotals?.allTimeMinutes ?? 0, totalFocusMinutes),
      activeDays: ownTotals?.activeDays ?? 0,
      currentStreak: currentStreak(new Set(days.filter(day => day.ownMinutes > 0).map(day => day.date)), today),
    } : null,
    challenge: savedChallenge ? {
      id: savedChallenge.id,
      title: savedChallenge.title,
      targetMinutes: savedChallenge.targetMinutes,
      achievedCount: achievers.length,
      participantCount: eligibleIds.size,
      currentUserMinutes: isParticipant ? ownTotals?.todayMinutes ?? 0 : 0,
      currentUserAchieved: isParticipant && (ownTotals?.todayMinutes ?? 0) >= savedChallenge.targetMinutes,
      isParticipant,
      achievers: achievers.slice(0, 12).map(user => ({
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl ?? undefined,
        minutes: user.todayMinutes,
      })),
      createdAt: savedChallenge.createdAt.toISOString(),
      updatedAt: savedChallenge.updatedAt.toISOString(),
      resetsAt: tomorrow.toISOString(),
    } : null,
  }
}
