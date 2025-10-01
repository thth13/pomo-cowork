import { create } from 'zustand'
import { PomodoroSession, SessionType, SessionStatus, ActiveSession } from '@/types'

interface TimerState {
  // Timer state
  isRunning: boolean
  timeRemaining: number
  currentSession: PomodoroSession | null
  completedSessions: number

  // Active sessions from other users
  activeSessions: ActiveSession[]

  // Actions
  startSession: (task: string, duration: number, type: SessionType, sessionId?: string) => void
  pauseSession: () => void
  resumeSession: () => void
  completeSession: () => void
  cancelSession: () => void
  tick: () => void
  setActiveSessions: (sessions: ActiveSession[]) => void
  updateActiveSessionTime: (sessionId: string, timeRemaining: number) => void
  restoreSession: (session: PomodoroSession) => void
  previewSessionType: (type: SessionType) => void

  // Settings
  workDuration: number
  shortBreak: number
  longBreak: number
  longBreakAfter: number
  setTimerSettings: (settings: {
    workDuration: number
    shortBreak: number
    longBreak: number
    longBreakAfter: number
  }) => void
  initializeWithSettings: (settings: {
    workDuration: number
    shortBreak: number
    longBreak: number
    longBreakAfter: number
  }) => void
}

export const useTimerStore = create<TimerState>((set, get) => ({
  // Initial state with default settings
  isRunning: false,
  timeRemaining: 25 * 60, // Default: 25 minutes in seconds
  currentSession: null,
  completedSessions: 0,
  activeSessions: [],

  // Default settings (25 min work, 5 min short break, 15 min long break)
  workDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakAfter: 4,

  startSession: (task: string, duration: number, type: SessionType, sessionId?: string) => {
    const session: PomodoroSession = {
      id: sessionId || Date.now().toString(),
      userId: 'current-user', // Will be replaced with actual user ID
      task,
      duration,
      type,
      status: SessionStatus.ACTIVE,
      startedAt: new Date().toISOString(),
    }
    
    set({
      currentSession: session,
      timeRemaining: duration * 60,
      isRunning: true,
    })
  },

  restoreSession: (session: PomodoroSession) => {
    const startTime = new Date(session.startedAt).getTime()
    const now = Date.now()
    const elapsed = Math.floor((now - startTime) / 1000)
    const totalDuration = session.duration * 60
    const remaining = Math.max(0, totalDuration - elapsed)
    
    if (remaining > 0) {
      set({
        currentSession: session,
        timeRemaining: remaining,
        isRunning: session.status === SessionStatus.ACTIVE,
      })
    }
  },

  pauseSession: () => {
    const { currentSession } = get()
    if (currentSession) {
      set({
        isRunning: false,
        currentSession: {
          ...currentSession,
          status: SessionStatus.PAUSED,
        },
      })
    }
  },

  resumeSession: () => {
    const { currentSession } = get()
    if (currentSession) {
      set({
        isRunning: true,
        currentSession: {
          ...currentSession,
          status: SessionStatus.ACTIVE,
        },
      })
    }
  },

  completeSession: () => {
    const { currentSession, completedSessions } = get()
    
    if (currentSession) {
      set({
        isRunning: false,
        currentSession: {
          ...currentSession,
          status: SessionStatus.COMPLETED,
          completedAt: new Date().toISOString(),
        },
        completedSessions: completedSessions + 1,
        timeRemaining: 0,
      })
      
      // Auto-suggest next session type
      const nextType = getNextSessionType(completedSessions + 1, get().longBreakAfter)
      const nextDuration = getSessionDuration(nextType, get())
      
      setTimeout(() => {
        set({
          currentSession: null,
          timeRemaining: nextDuration * 60,
        })
      }, 3000) // Show completion for 3 seconds
    }
  },

  cancelSession: () => {
    const state = get()
    const { currentSession } = state
    if (currentSession) {
      const fallbackDuration = getSessionDuration(currentSession.type, state)
      set({
        isRunning: false,
        currentSession: null,
        timeRemaining: fallbackDuration * 60,
      })
    }
  },

  tick: () => {
    const { isRunning, timeRemaining } = get()
    if (isRunning && timeRemaining > 0) {
      set({ timeRemaining: timeRemaining - 1 })
    } else if (isRunning && timeRemaining === 0) {
      get().completeSession()
    }
  },

  setActiveSessions: (sessions: ActiveSession[]) => {
    set({ activeSessions: sessions })
  },

  updateActiveSessionTime: (sessionId, timeRemaining) => {
    set((state) => ({
      activeSessions: state.activeSessions.map((session) => (
        session.id === sessionId
          ? { ...session, timeRemaining }
          : session
      ))
    }))
  },

  previewSessionType: (type) => {
    const state = get()
    const { currentSession } = state
    if (currentSession) {
      return
    }

    const duration = getSessionDuration(type, state)
    set({
      timeRemaining: duration * 60,
    })
  },

  setTimerSettings: (settings) => {
    set({
      workDuration: settings.workDuration,
      shortBreak: settings.shortBreak,
      longBreak: settings.longBreak,
      longBreakAfter: settings.longBreakAfter,
    })
  },

  initializeWithSettings: (settings) => {
    set({
      workDuration: settings.workDuration,
      shortBreak: settings.shortBreak,
      longBreak: settings.longBreak,
      longBreakAfter: settings.longBreakAfter,
      timeRemaining: settings.workDuration * 60, // Initialize timeRemaining with workDuration
    })
  },
}))

// Helper functions
function getNextSessionType(completedSessions: number, longBreakAfter: number): SessionType {
  if (completedSessions % longBreakAfter === 0) {
    return SessionType.LONG_BREAK
  }
  return completedSessions % 2 === 0 ? SessionType.WORK : SessionType.SHORT_BREAK
}

function getSessionDuration(type: SessionType, state: TimerState): number {
  switch (type) {
    case SessionType.WORK:
      return state.workDuration
    case SessionType.SHORT_BREAK:
      return state.shortBreak
    case SessionType.LONG_BREAK:
      return state.longBreak
    default:
      return state.workDuration
  }
}
