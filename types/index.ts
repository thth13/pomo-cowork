export interface User {
  id: string
  email: string
  username: string
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
  task: string
  duration: number
  type: SessionType
  status: SessionStatus
  startedAt: string
  endedAt?: string
  completedAt?: string
  timeRemaining?: number
}

export enum SessionType {
  WORK = 'WORK',
  SHORT_BREAK = 'SHORT_BREAK',
  LONG_BREAK = 'LONG_BREAK'
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
  task: string
  timeRemaining: number
  type: SessionType
  startedAt: string
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
