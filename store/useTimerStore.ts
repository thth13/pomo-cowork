import { create } from 'zustand'
import { PomodoroSession, SessionType, SessionStatus, ActiveSession } from '@/types'

export const TIME_TRACKER_DURATION_MINUTES = 24 * 60

interface TimerTaskOption {
  id: string
  title: string
  description?: string
  completed?: boolean
}

interface TimerState {
  // Timer state
  isRunning: boolean
  timeRemaining: number
  currentSession: PomodoroSession | null
  completedSessions: number
  pausedAt: number | null // timestamp when paused

  // Active sessions from other users
  activeSessions: ActiveSession[]

  // Selected task
  selectedTask: {
    id: string
    title: string
    description?: string
  } | null
  taskOptions: TimerTaskOption[]

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
  setSelectedTask: (task: { id: string; title: string; description?: string } | null) => void
  setTaskOptions: (tasks: TimerTaskOption[]) => void

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
  pausedAt: null,
  activeSessions: [],
  selectedTask: null,
  taskOptions: [],

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
      timeRemaining: duration * 60,
    }
    
    set({
      currentSession: session,
      timeRemaining: duration * 60,
      isRunning: true,
      pausedAt: null,
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
        currentSession: {
          ...session,
          timeRemaining: remaining,
        },
        timeRemaining: remaining,
        isRunning: session.status === SessionStatus.ACTIVE,
        pausedAt: session.status === SessionStatus.PAUSED ? Date.now() : null,
      })
    }
  },

  pauseSession: () => {
    const { currentSession, timeRemaining } = get()
    if (currentSession) {
      set({
        isRunning: false,
        pausedAt: Date.now(),
        currentSession: {
          ...currentSession,
          status: SessionStatus.PAUSED,
          timeRemaining,
        },
      })
    }
  },

  resumeSession: () => {
    const { currentSession, pausedAt, timeRemaining } = get()
    if (currentSession && pausedAt) {
      // Adjust startedAt to account for pause time
      const pauseDuration = Date.now() - pausedAt
      const newStartedAt = new Date(new Date(currentSession.startedAt).getTime() + pauseDuration).toISOString()
      
      set({
        isRunning: true,
        pausedAt: null,
        currentSession: {
          ...currentSession,
          status: SessionStatus.ACTIVE,
          startedAt: newStartedAt, // Update startedAt to compensate for pause
          timeRemaining,
        },
      })
    }
  },

  completeSession: () => {
    const { currentSession, completedSessions } = get()
    
    if (currentSession) {
      const completedType = currentSession.type
      // Increment only for work sessions (pomodoros)
      const newCompletedCount = completedType === SessionType.WORK 
        ? completedSessions + 1 
        : completedSessions
      
      // Determine next session type based on what just completed
      const nextType = getNextSessionType(completedType, newCompletedCount, get().longBreakAfter)
      const nextDuration = getSessionDuration(nextType, get())
      
      set({
        isRunning: false,
        currentSession: null,
        completedSessions: newCompletedCount,
        timeRemaining: nextDuration * 60,
        pausedAt: null,
      })
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
        pausedAt: null,
      })
    }
  },

  tick: () => {
    const { isRunning, timeRemaining } = get()
    if (isRunning && timeRemaining > 0) {
      set({ timeRemaining: timeRemaining - 1 })
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

  setSelectedTask: (task) => {
    set({ selectedTask: task })
  },

  setTaskOptions: (tasks) => {
    set({ taskOptions: tasks })
  },
}))

// Helper functions
function getNextSessionType(
  completedType: SessionType, 
  completedWorkSessions: number, 
  longBreakAfter: number
): SessionType {
  // After work session → break (short or long depending on count)
  if (completedType === SessionType.WORK) {
    // Long break after every N work sessions
    if (completedWorkSessions > 0 && completedWorkSessions % longBreakAfter === 0) {
      return SessionType.LONG_BREAK
    }
    return SessionType.SHORT_BREAK
  }
  
  // After any break → work
  if (
    completedType === SessionType.SHORT_BREAK || 
    completedType === SessionType.LONG_BREAK
  ) {
    return SessionType.WORK
  }
  
  // Default fallback (e.g., after time tracking)
  return SessionType.WORK
}

function getSessionDuration(type: SessionType, state: TimerState): number {
  switch (type) {
    case SessionType.WORK:
      return state.workDuration
    case SessionType.SHORT_BREAK:
      return state.shortBreak
    case SessionType.LONG_BREAK:
      return state.longBreak
    case SessionType.TIME_TRACKING:
      return TIME_TRACKER_DURATION_MINUTES
    default:
      return state.workDuration
  }
}
