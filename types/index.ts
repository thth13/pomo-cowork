export interface User {
  id: string
  email: string
  username: string
  avatarUrl?: string
  description?: string
  createdAt: string
  isAnonymous?: boolean
  settings?: UserSettings
}

export interface UserSettings {
  id: string
  userId: string
  workDuration: number
  shortBreak: number
  longBreak: number
  longBreakAfter: number
  soundEnabled: boolean
  soundVolume: number
  notificationsEnabled: boolean
}

export interface PomodoroSession {
  id: string
  userId: string
  user?: User
  roomId?: string | null
  task: string
  duration: number
  type: SessionType
  status: SessionStatus
  startedAt: string
  endedAt?: string
  completedAt?: string
  timeRemaining?: number
  pausedAt?: string
  remainingSeconds?: number
}

export enum RoomPrivacy {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export interface Room {
  id: string
  name: string
  privacy: RoomPrivacy
  ownerId: string
  backgroundGradientKey?: string | null
  createdAt: string
  updatedAt: string
  memberCount?: number
}

export interface RoomMemberUser {
  id: string
  username: string
  avatarUrl?: string
}

export interface RoomMember {
  id: string
  roomId: string
  userId: string
  role: string
  createdAt: string
  user: RoomMemberUser
}

export interface RoomInvite {
  id: string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED'
  roomId: string
  room: { id: string; name: string }
  inviter: { id: string; username: string; avatarUrl?: string }
}

export interface NotificationItem {
  id: string
  type: 'ROOM_INVITE'
  title: string
  message: string
  readAt: string | null
  createdAt: string
  roomInviteId: string | null
  roomInvite: RoomInvite | null
}

export interface RoomStats {
  totalPomodoros: number
  totalFocusMinutes: number
  totalFocusHours?: number
  avgDailyFocusMinutes?: number
  weeklyActivity: Array<{ date: string; hours: number }>
  topUsers?: Array<{
    id: string
    username: string
    avatarUrl?: string
    hours: number
    contributionPercent: number
  }>
}

export enum SessionType {
  WORK = 'WORK',
  SHORT_BREAK = 'SHORT_BREAK',
  LONG_BREAK = 'LONG_BREAK',
  TIME_TRACKING = 'TIME_TRACKING',
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface TimerState {
  isRunning: boolean
  timeRemaining: number
  currentSession?: PomodoroSession
  completedSessions: number
}

export interface ActiveSession {
  id: string
  userId: string
  username: string
  avatarUrl?: string
  roomId?: string | null
  task: string
  duration: number
  timeRemaining: number
  type: SessionType
  startedAt: string
  status?: SessionStatus
}

export interface SessionStats {
  totalSessions: number
  totalMinutes: number
  todaysSessions: number
  todaysMinutes: number
  weeklyStats: {
    date: string
    sessions: number
    minutes: number
  }[]
  monthlyStats: {
    date: string
    sessions: number
    minutes: number
  }[]
}

export interface ChatMessage {
  id: string
  userId: string | null
  username: string
  avatarUrl?: string
  roomId?: string | null
  text: string
  timestamp: number
  type?: 'message' | 'system'
  action?: {
    type: 'work_start' | 'break_start' | 'long_break_start' | 'timer_stop' | 'session_complete' | 'time_tracking_start'
    duration?: number
    task?: string
  }
}

export interface UserSearchResult {
  id: string
  username: string
  avatarUrl?: string
  createdAt: string
  isOnline: boolean
  rank: number
  stats: {
    totalHours: number
    totalPomodoros: number
  }
}

export interface LeaderboardUser {
  id: string
  username: string
  avatarUrl?: string
  totalHours: number
  totalPomodoros: number
  rank: number
}

export interface TomatoThrow {
  id: string
  fromUserId: string
  toUserId: string
  fromUsername: string
  timestamp: number
  x?: number
  y?: number
}
