import type { RoomStats } from '@/types'

export type RoomLeaderboardPeriod = 'today' | 'week' | 'allTime'

export interface RoomLeaderboardEntry {
  id: string
  username: string
  avatarUrl?: string
  minutes: number
  pomodoros: number
  contributionPercent: number
  rank: number
}

export interface RoomLeaderboard {
  entries: RoomLeaderboardEntry[]
  totalParticipants: number
  totalMinutes: number
  currentUser: RoomLeaderboardEntry | null
}

export interface RoomPersonalContribution {
  todayMinutes: number
  weekMinutes: number
  allTimeMinutes: number
  todayPomodoros: number
  totalPomodoros: number
  contributionPercent: number
  activeDays: number
  currentStreak: number
}

export interface RoomChallengeProgress {
  id: string
  title: string
  targetMinutes: number
  achievedCount: number
  participantCount: number
  currentUserMinutes: number
  currentUserAchieved: boolean
  isParticipant: boolean
  achievers: Array<{ id: string; username: string; avatarUrl?: string; minutes: number }>
  createdAt: string
  updatedAt: string
  resetsAt: string
}

export interface RoomEngagementStats extends RoomStats {
  timezone: 'UTC'
  generatedAt: string
  dayEndsAt: string
  todayFocusMinutes: number
  todayParticipants: number
  roomStreak: number
  weeklyActivity: Array<{
    date: string
    hours: number
    minutes: number
    ownMinutes: number
    participants: number
  }>
  leaderboards: Record<RoomLeaderboardPeriod, RoomLeaderboard>
  personal: RoomPersonalContribution | null
  challenge: RoomChallengeProgress | null
}
