'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Settings } from 'lucide-react'
import { TIME_TRACKER_DURATION_MINUTES, useTimerStore } from '@/store/useTimerStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useSocket } from '@/hooks/useSocket'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useSessionRestore } from '@/hooks/useSessionRestore'
import { useTimerSync } from '@/hooks/useTimerSync'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import { useAutoStart } from '@/hooks/useAutoStart'
import { SessionStatus, SessionType } from '@/types'
import { getOrCreateAnonymousId, getAnonymousUsername } from '@/lib/anonymousUser'
import { sendMessageToServiceWorker } from '@/lib/serviceWorker'
import { sessionService, SessionData } from '@/services/sessionService'
import { taskService } from '@/services/taskService'
import { useNotifications } from '@/hooks/useNotifications'
import { TaskOption } from '@/types/task'
import { TaskPicker } from '@/components/TaskPicker'
import { TimerControls } from '@/components/TimerControls'
import { SettingsModal } from '@/components/SettingsModal'
import { TimerErrorBoundary } from '@/components/TimerErrorBoundary'
import { useThrottle } from '@/hooks/useThrottle'

interface PomodoroTimerProps {
  onSessionComplete?: () => void
}

interface TimerSettingsForm {
  workDuration: number
  shortBreak: number
  longBreak: number
}

interface TimerState {
  sessionType: SessionType
  notificationEnabled: boolean
  soundEnabled: boolean
  soundVolume: number
  isTimeTrackerMode: boolean
  isStarting: boolean
  isStopping: boolean
  isSettingsOpen: boolean
  settingsForm: TimerSettingsForm
  isAutoStartEnabled: boolean
}

type TimerAction =
  | { type: 'SET_SESSION_TYPE'; payload: SessionType }
  | { type: 'SET_NOTIFICATION_ENABLED'; payload: boolean }
  | { type: 'SET_SOUND_ENABLED'; payload: boolean }
  | { type: 'SET_SOUND_VOLUME'; payload: number }
  | { type: 'SET_STARTING'; payload: boolean }
  | { type: 'SET_STOPPING'; payload: boolean }
  | { type: 'SET_SETTINGS_OPEN'; payload: boolean }
  | { type: 'SET_SETTINGS_FORM'; payload: TimerSettingsForm }
  | { type: 'UPDATE_SETTINGS_FORM'; payload: { field: keyof TimerSettingsForm; value: number } }
  | { type: 'SET_AUTO_START_ENABLED'; payload: boolean }
  | { type: 'SET_TIME_TRACKER_MODE'; payload: boolean }
  | { type: 'SET_PREFERENCES'; payload: { notificationEnabled: boolean; soundEnabled: boolean; soundVolume: number } }

const readBooleanFromLocalStorage = (key: string, fallback: boolean): boolean => {
  if (typeof window === 'undefined') {
    return fallback
  }
  const stored = localStorage.getItem(key)
  if (stored === null) {
    return fallback
  }
  return stored === 'true'
}

const readPreferencesFromLocalStorage = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = localStorage.getItem('pomodoro:preferences')
    if (!stored) {
      return null
    }

    return JSON.parse(stored) as {
      notificationEnabled: boolean
      soundEnabled: boolean
      soundVolume: number
    }
  } catch (error) {
    console.warn('Failed to parse stored pomodoro preferences', error)
    return null
  }
}

const createInitialTimerState = (durations: TimerSettingsForm): TimerState => {
  const storedPreferences = readPreferencesFromLocalStorage()

  return {
    sessionType: SessionType.WORK,
    notificationEnabled: storedPreferences?.notificationEnabled ?? true,
    soundEnabled: storedPreferences?.soundEnabled ?? true,
    soundVolume: storedPreferences?.soundVolume ?? 0.5,
    isTimeTrackerMode: readBooleanFromLocalStorage('pomodoro:timeTrackerMode', false),
    isStarting: false,
    isStopping: false,
    isSettingsOpen: false,
    settingsForm: { ...durations },
    isAutoStartEnabled: readBooleanFromLocalStorage('pomodoro:autoStartEnabled', true),
  }
}

function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'SET_SESSION_TYPE':
      return { ...state, sessionType: action.payload }
    case 'SET_NOTIFICATION_ENABLED':
      return { ...state, notificationEnabled: action.payload }
    case 'SET_SOUND_ENABLED':
      return { ...state, soundEnabled: action.payload }
    case 'SET_SOUND_VOLUME':
      return { ...state, soundVolume: action.payload }
    case 'SET_STARTING':
      return { ...state, isStarting: action.payload }
    case 'SET_STOPPING':
      return { ...state, isStopping: action.payload }
    case 'SET_SETTINGS_OPEN':
      return { ...state, isSettingsOpen: action.payload }
    case 'SET_SETTINGS_FORM':
      return { ...state, settingsForm: action.payload }
    case 'UPDATE_SETTINGS_FORM':
      return {
        ...state,
        settingsForm: {
          ...state.settingsForm,
          [action.payload.field]: action.payload.value,
        },
      }
    case 'SET_AUTO_START_ENABLED':
      return { ...state, isAutoStartEnabled: action.payload }
    case 'SET_TIME_TRACKER_MODE':
      return { ...state, isTimeTrackerMode: action.payload }
    case 'SET_PREFERENCES':
      return {
        ...state,
        notificationEnabled: action.payload.notificationEnabled,
        soundEnabled: action.payload.soundEnabled,
        soundVolume: action.payload.soundVolume,
      }
    default:
      return state
  }
}

const useTaskMenu = (isDisabled: boolean) => {
  const [isTaskMenuOpen, setIsTaskMenuOpen] = useState(false)
  const [taskSearch, setTaskSearch] = useState('')
  const taskPickerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isTaskMenuOpen) {
      setTaskSearch('')
      return
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (taskPickerRef.current && !taskPickerRef.current.contains(event.target as Node)) {
        setIsTaskMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsTaskMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isTaskMenuOpen])

  useEffect(() => {
    if (isDisabled && isTaskMenuOpen) {
      setIsTaskMenuOpen(false)
    }
  }, [isDisabled, isTaskMenuOpen])

  return {
    isTaskMenuOpen,
    setIsTaskMenuOpen,
    taskSearch,
    setTaskSearch,
    taskPickerRef,
  }
}

function PomodoroTimerInner({ onSessionComplete }: PomodoroTimerProps) {
  const {
    isRunning,
    timeRemaining,
    currentSession,
    completedSessions,
    workDuration,
    shortBreak,
    longBreak,
    longBreakAfter,
    selectedTask,
    setSelectedTask,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    cancelSession,
    restoreSession,
    previewSessionType,
    initializeWithSettings,
    setTimerSettings,
    taskOptions,
  } = useTimerStore()

  const { user, updateUserSettings } = useAuthStore()
  const { emitSessionStart, emitSessionSync, emitSessionPause, emitSessionEnd, emitTimerTick } = useSocket()

  const [timerState, dispatchTimer] = useReducer(
    timerReducer,
    { workDuration, shortBreak, longBreak },
    createInitialTimerState
  )
  const {
    sessionType,
    notificationEnabled,
    soundEnabled,
    soundVolume,
    isStarting,
    isStopping,
    isSettingsOpen,
    settingsForm,
    isAutoStartEnabled,
    isTimeTrackerMode,
  } = timerState
  const completedSessionIdRef = useRef<string | null>(null)
  const startRequestIdRef = useRef(0)
  const lastStoppedSessionIdRef = useRef<string | null>(null)
  const canTriggerAction = useThrottle(1000)
  const [isPausing, setIsPausing] = useState(false)
  const [isResuming, setIsResuming] = useState(false)

  const setSessionType = useCallback(
    (type: SessionType) => dispatchTimer({ type: 'SET_SESSION_TYPE', payload: type }),
    [dispatchTimer]
  )
  const setNotificationEnabled = useCallback(
    (value: boolean) => dispatchTimer({ type: 'SET_NOTIFICATION_ENABLED', payload: value }),
    [dispatchTimer]
  )
  const setSoundEnabled = useCallback(
    (value: boolean) => dispatchTimer({ type: 'SET_SOUND_ENABLED', payload: value }),
    [dispatchTimer]
  )
  const setSoundVolume = useCallback(
    (value: number) => dispatchTimer({ type: 'SET_SOUND_VOLUME', payload: value }),
    [dispatchTimer]
  )
  const setIsTimeTrackerMode = useCallback(
    (value: boolean) => dispatchTimer({ type: 'SET_TIME_TRACKER_MODE', payload: value }),
    [dispatchTimer]
  )
  const setIsStarting = useCallback(
    (value: boolean) => dispatchTimer({ type: 'SET_STARTING', payload: value }),
    [dispatchTimer]
  )
  const setIsStopping = useCallback(
    (value: boolean) => dispatchTimer({ type: 'SET_STOPPING', payload: value }),
    [dispatchTimer]
  )
  const setIsSettingsOpen = useCallback(
    (value: boolean) => dispatchTimer({ type: 'SET_SETTINGS_OPEN', payload: value }),
    [dispatchTimer]
  )
  const setSettingsForm = useCallback(
    (form: TimerSettingsForm) => dispatchTimer({ type: 'SET_SETTINGS_FORM', payload: form }),
    [dispatchTimer]
  )
  const updateSettingsForm = useCallback(
    (field: keyof TimerSettingsForm, value: number) =>
      dispatchTimer({ type: 'UPDATE_SETTINGS_FORM', payload: { field, value } }),
    [dispatchTimer]
  )
  const setIsAutoStartEnabled = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const nextValue = typeof value === 'function' ? value(isAutoStartEnabled) : value
      dispatchTimer({ type: 'SET_AUTO_START_ENABLED', payload: nextValue })
    },
    [dispatchTimer, isAutoStartEnabled]
  )

  const isTaskPickerDisabled = !!currentSession

  const {
    isTaskMenuOpen,
    setIsTaskMenuOpen,
    taskSearch,
    setTaskSearch,
    taskPickerRef,
  } = useTaskMenu(isTaskPickerDisabled)

  const { scheduleAutoStart, clearAutoStart } = useAutoStart(isAutoStartEnabled)

  useWakeLock(Boolean(isRunning && currentSession))

  const { mutateSessions } = useSessionRestore({
    user,
    currentSession,
    restoreSession,
    setSessionType,
    emitSessionSync,
    ignoreSessionIdRef: lastStoppedSessionIdRef,
  })

  const { showNotification, playSound } = useNotifications(
    notificationEnabled,
    soundEnabled,
    soundVolume
  )

  const filteredTaskOptions = useMemo(() => {
    const query = taskSearch.trim().toLowerCase()
    if (!query) {
      return taskOptions
    }

    return taskOptions.filter((taskOption) => {
      const haystack = `${taskOption.title} ${taskOption.description ?? ''}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [taskOptions, taskSearch])

  const handleTaskSelect = (taskOption: TaskOption | null) => {
    if (taskOption) {
      setSelectedTask({
        id: taskOption.id,
        title: taskOption.title,
        description: taskOption.description,
      })
    } else {
      setSelectedTask(null)
    }

    setIsTaskMenuOpen(false)
  }

  useEffect(() => {
    setSettingsForm({
      workDuration,
      shortBreak,
      longBreak,
    })
  }, [workDuration, shortBreak, longBreak, setSettingsForm])

  useEffect(() => {
    completedSessionIdRef.current = null
  }, [currentSession?.id])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      localStorage.setItem('pomodoro:autoStartEnabled', String(isAutoStartEnabled))
      localStorage.setItem('pomodoro:timeTrackerMode', String(isTimeTrackerMode))
      const preferencesPayload = JSON.stringify({
        notificationEnabled,
        soundEnabled,
        soundVolume,
      })
      localStorage.setItem('pomodoro:preferences', preferencesPayload)
    } catch (error) {
      console.warn('Failed to persist Pomodoro preferences', error)
    }
  }, [isAutoStartEnabled, isTimeTrackerMode, notificationEnabled, soundEnabled, soundVolume])

  useEffect(() => {
    if (!user?.settings || currentSession) {
      return
    }

    initializeWithSettings({
      workDuration: user.settings.workDuration,
      shortBreak: user.settings.shortBreak,
      longBreak: user.settings.longBreak,
      longBreakAfter: user.settings.longBreakAfter,
    })

  }, [user?.settings, currentSession, initializeWithSettings])

  useEffect(() => {
    if (user?.settings) {
      setNotificationEnabled(user.settings.notificationsEnabled)
      setSoundEnabled(user.settings.soundEnabled)
      setSoundVolume(user.settings.soundVolume)
      return
    }

    setNotificationEnabled(true)
    setSoundEnabled(true)
    setSoundVolume(0.5)
  }, [
    setNotificationEnabled,
    setSoundEnabled,
    setSoundVolume,
    user?.settings,
  ])

  const getSessionTypeLabel = useCallback((type: SessionType): string => {
    switch (type) {
      case SessionType.WORK:
        return 'Work'
      case SessionType.SHORT_BREAK:
        return 'Short break'
      case SessionType.LONG_BREAK:
        return 'Long break'
      case SessionType.TIME_TRACKING:
        return 'Time tracking'
      default:
        return 'Work'
    }
  }, [])

  const timeTrackerDurationSeconds = TIME_TRACKER_DURATION_MINUTES * 60
  const activeSessionType = currentSession?.type ?? (isTimeTrackerMode ? SessionType.TIME_TRACKING : sessionType)
  const isTimeTrackingSession = activeSessionType === SessionType.TIME_TRACKING
  const timerDisplaySeconds = isTimeTrackingSession
    ? Math.max(0, currentSession ? timeTrackerDurationSeconds - timeRemaining : 0)
    : timeRemaining

  // Update page title with timer time
  useEffect(() => {
    if (isRunning && currentSession && (timeRemaining > 0 || isTimeTrackingSession)) {
      const timeStr = formatTime(timerDisplaySeconds)
      const sessionLabel = getSessionTypeLabel(activeSessionType as SessionType)
      document.title = `${timeStr} - ${sessionLabel} | Pomo Cowork`
    } else {
      document.title = 'Pomo Cowork'
    }

    return () => {
      document.title = 'Pomo Cowork'
    }
  }, [getSessionTypeLabel, isRunning, currentSession, timeRemaining, timerDisplaySeconds, activeSessionType, isTimeTrackingSession])

  const getSessionDuration = useCallback((type: SessionType): number => {
    switch (type) {
      case SessionType.WORK:
        return workDuration
      case SessionType.SHORT_BREAK:
        return shortBreak
      case SessionType.LONG_BREAK:
        return longBreak
      case SessionType.TIME_TRACKING:
        return TIME_TRACKER_DURATION_MINUTES
      default:
        return workDuration
    }
  }, [workDuration, shortBreak, longBreak])

  const initiateSession = useCallback(async (type: SessionType): Promise<void> => {
    const requestId = ++startRequestIdRef.current
    const duration = getSessionDuration(type)
    const taskName =
      type === SessionType.TIME_TRACKING
        ? selectedTask?.title || 'Time tracking'
        : type === SessionType.WORK
          ? selectedTask?.title || 'Work Session'
          : getSessionTypeLabel(type)

    const userId = user?.id || getOrCreateAnonymousId()
    const username = user?.username || getAnonymousUsername()

    try {
      const dbSession = await sessionService.create({
        task: taskName,
        duration,
        type,
        anonymousId: user ? undefined : userId,
      })
      void mutateSessions()
      if (requestId !== startRequestIdRef.current) {
        return
      }

      startSession(taskName, duration, type, dbSession.id)

      sendMessageToServiceWorker({
        type: 'START_TIMER',
        payload: {
          sessionId: dbSession.id,
          duration,
          timeRemaining: duration * 60,
          startedAt: dbSession.startedAt,
        },
      })

      const sessionData = {
        id: dbSession.id,
        task: taskName,
        duration,
        type,
        userId,
        username,
        avatarUrl: user?.avatarUrl,
        timeRemaining: duration * 60,
        startedAt: dbSession.startedAt,
        status: SessionStatus.ACTIVE,
      }

      emitSessionStart(sessionData)
    } catch (error) {
      console.error('Failed to initiate session:', error)
      if (requestId !== startRequestIdRef.current) {
        return
      }
      startSession(taskName, duration, type)
    }
  }, [
    emitSessionStart,
    getSessionDuration,
    getSessionTypeLabel,
    mutateSessions,
    selectedTask?.title,
    startSession,
    user,
  ])

  const handleSessionTypeChange = (type: SessionType) => {
    if (currentSession) return
    clearAutoStart()
    setSessionType(type)
    previewSessionType(type)
  }

  const openSettings = () => {
    setSettingsForm({
      workDuration,
      shortBreak,
      longBreak,
    })
    setIsSettingsOpen(true)
  }

  const handleSettingsChange = (key: keyof TimerSettingsForm, value: number) => {
    updateSettingsForm(key, value)
  }

  const handleSettingsSave = async () => {
    const normalized: TimerSettingsForm = {
      workDuration: Math.max(1, Math.round(settingsForm.workDuration)),
      shortBreak: Math.max(1, Math.round(settingsForm.shortBreak)),
      longBreak: Math.max(1, Math.round(settingsForm.longBreak)),
    }

    setSettingsForm(normalized)
    setTimerSettings({
      workDuration: normalized.workDuration,
      shortBreak: normalized.shortBreak,
      longBreak: normalized.longBreak,
      longBreakAfter,
    })

    if (user) {
      updateUserSettings({
        workDuration: normalized.workDuration,
        shortBreak: normalized.shortBreak,
        longBreak: normalized.longBreak,
        longBreakAfter,
      })
    }

    // Save to backend if user is authenticated
    if (user) {
      try {
        const token = localStorage.getItem('token')
        if (token) {
          await fetch('/api/settings', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              workDuration: normalized.workDuration,
              shortBreak: normalized.shortBreak,
              longBreak: normalized.longBreak,
              longBreakAfter,
              soundEnabled,
              soundVolume,
              notificationsEnabled: notificationEnabled
            })
          })
        }
      } catch (error) {
        console.error('Failed to save timer settings:', error)
      }
    }

    if (!currentSession) {
      previewSessionType(sessionType)
    }

    setIsSettingsOpen(false)
  }

  const getNextSessionType = useCallback((completedType: SessionType): SessionType => {
    // Get fresh state from store to avoid stale closures
    const { completedSessions: currentCompletedSessions, longBreakAfter: currentLongBreakAfter } = useTimerStore.getState()
    
    // After work session → break (short or long depending on count)
    if (completedType === SessionType.WORK) {
      // Use current count from store (already incremented by completeSession)
      // Long break after every N work sessions
      if (currentCompletedSessions > 0 && currentCompletedSessions % currentLongBreakAfter === 0) {
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
  }, []) // No dependencies - always reads fresh from store

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleStart = async () => {
    // Prevent multiple rapid clicks (throttled)
    if (isStarting || !canTriggerAction()) return
    
    clearAutoStart()

    const requestId = ++startRequestIdRef.current

    setIsStarting(true)

    try {
      const startType = isTimeTrackerMode ? SessionType.TIME_TRACKING : sessionType

      // If there's already an active session, silently end it first
      if (currentSession) {
        const sessionId = currentSession.id
        
        // Stop local timer
        cancelSession()
        
        // Stop Service Worker timer
        sendMessageToServiceWorker({
          type: 'STOP_TIMER',
        })
        
        // End session quietly (this will be replaced by new session immediately)
        emitSessionEnd(sessionId, 'reset')
        
        // Update session in database to completed state
        try {
          await sessionService.update(sessionId, {
            status: SessionStatus.CANCELLED,
            endedAt: new Date().toISOString(),
            pausedAt: null,
            timeRemaining: 0,
          })
          void mutateSessions()
        } catch (error) {
          console.error('Failed to update previous session:', error)
        }
      }

      const duration = getSessionDuration(startType)
      const taskName =
        startType === SessionType.TIME_TRACKING
          ? selectedTask?.title || 'Time tracking'
          : selectedTask?.title || getSessionTypeLabel(startType)

      // Get user ID or anonymous ID
      const userId = user?.id || getOrCreateAnonymousId()
      const username = user?.username || getAnonymousUsername()

      // Create session in database first
      try {
        const sessionPayload: SessionData = {
          task: taskName,
          duration,
          type: startType,
          anonymousId: user ? undefined : userId,
        }

        const dbSession = await sessionService.create(sessionPayload)
        void mutateSessions()
        if (requestId !== startRequestIdRef.current) {
          return
        }
        
        // Start timer with real session ID
        startSession(taskName, duration, startType, dbSession.id)
        
        // Start Service Worker timer with real ID
        sendMessageToServiceWorker({
          type: 'START_TIMER',
          payload: {
            sessionId: dbSession.id,
            duration,
            timeRemaining: duration * 60,
            startedAt: dbSession.startedAt,
          },
        })
        
        // Emit to WebSocket with real session ID
        const sessionData = {
          id: dbSession.id,
          task: taskName,
          duration,
          type: startType,
          userId,
          username,
          avatarUrl: user?.avatarUrl,
          timeRemaining: duration * 60,
          startedAt: dbSession.startedAt,
          status: SessionStatus.ACTIVE,
        }
        
        emitSessionStart(sessionData)
      } catch (error) {
        console.error('Failed to create session:', error)
        // Fallback: start with temporary ID
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        if (requestId !== startRequestIdRef.current) {
          return
        }
        startSession(taskName, duration, startType, tempId)
        
        sendMessageToServiceWorker({
          type: 'START_TIMER',
          payload: {
            sessionId: tempId,
            duration,
            timeRemaining: duration * 60,
            startedAt: new Date().toISOString(),
          },
        })
      }
    } finally {
      // Add minimum delay to prevent too rapid clicks
      setTimeout(() => {
        setIsStarting(false)
      }, 500)
    }
  }

  const handlePause = async () => {
    if (!currentSession || currentSession.status === SessionStatus.PAUSED) {
      return
    }

    if (isPausing || !canTriggerAction()) return

    setIsPausing(true)
    clearAutoStart()

    const sessionSnapshot = currentSession
    const sessionId = sessionSnapshot.id
    const currentTimeRemaining = useTimerStore.getState().timeRemaining
    const userId = user?.id || getOrCreateAnonymousId()
    const username = user?.username || getAnonymousUsername()
    const avatarUrl = user?.avatarUrl

    try {
      pauseSession()

      sendMessageToServiceWorker({
        type: 'PAUSE_TIMER',
      })

      emitSessionPause(sessionId)

      const pausedSession = useTimerStore.getState().currentSession

      emitSessionSync({
        id: sessionId,
        task: sessionSnapshot.task,
        duration: sessionSnapshot.duration,
        type: sessionSnapshot.type,
        userId,
        username,
        avatarUrl,
        timeRemaining: currentTimeRemaining,
        startedAt: pausedSession?.startedAt ?? sessionSnapshot.startedAt,
        status: SessionStatus.PAUSED,
      })

      await sessionService.update(sessionId, {
        status: SessionStatus.PAUSED,
        pausedAt: new Date().toISOString(),
        timeRemaining: currentTimeRemaining,
      })
      void mutateSessions()
    } catch (error) {
      console.error('Failed to pause session:', error)
      resumeSession()

      const resumedSession = useTimerStore.getState().currentSession
      const resumedStartedAt = resumedSession?.startedAt ?? sessionSnapshot.startedAt

      sendMessageToServiceWorker({
        type: 'RESUME_TIMER',
        payload: {
          timeRemaining: currentTimeRemaining,
          startedAt: resumedStartedAt,
        },
      })

      emitSessionSync({
        id: sessionId,
        task: sessionSnapshot.task,
        duration: sessionSnapshot.duration,
        type: sessionSnapshot.type,
        userId,
        username,
        avatarUrl,
        timeRemaining: currentTimeRemaining,
        startedAt: resumedStartedAt,
        status: SessionStatus.ACTIVE,
      })
    } finally {
      setTimeout(() => {
        setIsPausing(false)
      }, 300)
    }
  }

  const handleResume = async () => {
    if (!currentSession || currentSession.status !== SessionStatus.PAUSED) {
      return
    }

    if (isResuming || !canTriggerAction()) return

    setIsResuming(true)

    const sessionSnapshot = currentSession
    const sessionId = sessionSnapshot.id
    const currentTimeRemaining = useTimerStore.getState().timeRemaining
    const userId = user?.id || getOrCreateAnonymousId()
    const username = user?.username || getAnonymousUsername()
    const avatarUrl = user?.avatarUrl

    try {
      resumeSession()

      const resumedSession = useTimerStore.getState().currentSession
      const resumedStartedAt = resumedSession?.startedAt ?? new Date().toISOString()

      sendMessageToServiceWorker({
        type: 'RESUME_TIMER',
        payload: {
          timeRemaining: currentTimeRemaining,
          startedAt: resumedStartedAt,
        },
      })

      emitSessionSync({
        id: sessionId,
        task: sessionSnapshot.task,
        duration: sessionSnapshot.duration,
        type: sessionSnapshot.type,
        userId,
        username,
        avatarUrl,
        timeRemaining: currentTimeRemaining,
        startedAt: resumedStartedAt,
        status: SessionStatus.ACTIVE,
      })

      await sessionService.update(sessionId, {
        status: SessionStatus.ACTIVE,
        pausedAt: null,
        timeRemaining: currentTimeRemaining,
        startedAt: resumedStartedAt,
      })
      void mutateSessions()
    } catch (error) {
      console.error('Failed to resume session:', error)
      pauseSession()
      sendMessageToServiceWorker({
        type: 'PAUSE_TIMER',
      })
      const pausedSession = useTimerStore.getState().currentSession
      emitSessionPause(sessionId)
      emitSessionSync({
        id: sessionId,
        task: sessionSnapshot.task,
        duration: sessionSnapshot.duration,
        type: sessionSnapshot.type,
        userId,
        username,
        avatarUrl,
        timeRemaining: currentTimeRemaining,
        startedAt: pausedSession?.startedAt ?? sessionSnapshot.startedAt,
        status: SessionStatus.PAUSED,
      })
    } finally {
      setTimeout(() => {
        setIsResuming(false)
      }, 300)
    }
  }

  const handleStop = async () => {
    // Prevent multiple rapid clicks (throttled)
    if (isStopping || !canTriggerAction()) return
    
    clearAutoStart()
    startRequestIdRef.current += 1

    const previousSessionType = currentSession?.type ?? sessionType
    setIsStopping(true)

    try {
      if (currentSession) {
        const sessionId = currentSession.id
        lastStoppedSessionIdRef.current = sessionId
        const startedAtMs = currentSession.startedAt ? new Date(currentSession.startedAt).getTime() : null
        const isEarlyStop = startedAtMs ? Date.now() - startedAtMs < 60 * 1000 : false
        const elapsedSeconds = startedAtMs
          ? Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000))
          : TIME_TRACKER_DURATION_MINUTES * 60 - timeRemaining
        const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60))
        
        // Optimistically stop timer immediately
        cancelSession()
        
        // Stop Service Worker timer
        sendMessageToServiceWorker({
          type: 'STOP_TIMER',
        })
        
        emitSessionEnd(sessionId, 'manual', {
          removeActivity: isEarlyStop,
        })
        
        // Update session in database in background
        try {
          const updatePayload: Record<string, any> = {
            status: SessionStatus.CANCELLED,
            endedAt: new Date().toISOString(),
            pausedAt: null,
            timeRemaining: 0,
          }

          if (currentSession.type === SessionType.TIME_TRACKING) {
            updatePayload.duration = elapsedMinutes
          }

          await sessionService.update(sessionId, updatePayload)
          void mutateSessions()
        } catch (error) {
          console.error('Failed to update session:', error)
        }
      } else {
        lastStoppedSessionIdRef.current = null
        cancelSession()
      }
    } finally {
      if (previousSessionType === SessionType.SHORT_BREAK || previousSessionType === SessionType.LONG_BREAK) {
        setSessionType(SessionType.WORK)
        previewSessionType(SessionType.WORK)
      }

      // Add minimum delay to prevent too rapid clicks
      setTimeout(() => {
        setIsStopping(false)
      }, 500)
    }
  }

  const handleSessionComplete = useCallback(async () => {
    clearAutoStart()
    if (!currentSession) {
      return
    }

    if (completedSessionIdRef.current === currentSession.id) {
      return
    }

    completedSessionIdRef.current = currentSession.id

    const completedType = currentSession.type
    const sessionSnapshot = currentSession
    
    try {
      await sessionService.complete(sessionSnapshot.id)
      void mutateSessions()

      console.log('Checking pomodoro increment conditions:', {
        completedType,
        isWork: completedType === SessionType.WORK,
        selectedTask,
      })
      
      const token = localStorage.getItem('token')
      if (
        completedType === SessionType.WORK &&
        selectedTask &&
        selectedTask.id &&
        token
      ) {
        try {
          console.log('Incrementing pomodoro for task:', selectedTask.id)
          await taskService.incrementPomodoro(selectedTask.id)
          console.log('Pomodoro counter incremented successfully for task:', selectedTask.id)
        } catch (error) {
          console.error('Failed to increment task pomodoro:', error)
        }
      } else {
        console.log('Skipping pomodoro increment - conditions not met')
      }
    } catch (error) {
      console.error('Failed to update session:', error)
    }
    
    emitSessionEnd(sessionSnapshot.id, 'completed')
    
    completeSession()

    const nextType = getNextSessionType(completedType)
    setSessionType(nextType)

    const storeState = useTimerStore.getState()
    const pendingSession = storeState.currentSession
    const pendingTime = storeState.timeRemaining

    if (!pendingSession && pendingTime !== getSessionDuration(nextType) * 60) {
      previewSessionType(nextType)
    }

    if (onSessionComplete) {
      console.log('Calling onSessionComplete callback')
      await onSessionComplete()
      console.log('onSessionComplete callback finished')
    }

    const completionTitle = (() => {
      switch (completedType) {
        case SessionType.WORK:
          return 'Pomodoro completed 🍅'
        case SessionType.SHORT_BREAK:
          return 'Short break completed'
        case SessionType.LONG_BREAK:
          return 'Long break completed'
        default:
          return `${getSessionTypeLabel(completedType)} completed`
      }
    })()

    const nextLabel = getSessionTypeLabel(nextType)
    const notificationBody = isAutoStartEnabled
      ? `${nextLabel} up next.`
      : 'Start the next session when you are ready.'

    showNotification(completionTitle, notificationBody)

    if (nextType === SessionType.SHORT_BREAK || nextType === SessionType.LONG_BREAK) {
      playSound('start')
    } else {
      playSound('end')
    }

    if (isAutoStartEnabled) {
      scheduleAutoStart(() => initiateSession(nextType))
      return
    }

    clearAutoStart()
    previewSessionType(nextType)
  }, [
    clearAutoStart,
    completeSession,
    currentSession,
    emitSessionEnd,
    getNextSessionType,
    getSessionDuration,
    getSessionTypeLabel,
    initiateSession,
    isAutoStartEnabled,
    onSessionComplete,
    playSound,
    previewSessionType,
    scheduleAutoStart,
    selectedTask,
    showNotification,
    setSessionType,
    mutateSessions,
  ])

  useTimerSync({
    currentSession,
    isRunning,
    onSessionComplete: handleSessionComplete,
    emitTimerTick,
  })

  const handleVisibilityRecalculate = useCallback(() => {
    const session = useTimerStore.getState().currentSession
    const running = useTimerStore.getState().isRunning

    if (session && running) {
      const startTime = new Date(session.startedAt).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)
      const totalDuration = session.duration * 60
      const newTimeRemaining = Math.max(0, totalDuration - elapsed)

      const currentTimeRemaining = useTimerStore.getState().timeRemaining

      if (Math.abs(newTimeRemaining - currentTimeRemaining) > 2) {
        useTimerStore.setState({ timeRemaining: newTimeRemaining })
        console.log('Time recalculated on tab focus:', newTimeRemaining)
      }

      if (newTimeRemaining === 0) {
        handleSessionComplete()
      }
    }
  }, [handleSessionComplete])

  usePageVisibility(handleVisibilityRecalculate)

  const getSessionTypeColor = (type: SessionType): string => {
    switch (type) {
      case SessionType.WORK:
        return 'text-primary-600'
      case SessionType.SHORT_BREAK:
        return 'text-secondary-600'
      case SessionType.LONG_BREAK:
        return 'text-blue-600'
      case SessionType.TIME_TRACKING:
        return 'text-indigo-600'
      default:
        return 'text-primary-600'
    }
  }

  const isPaused = currentSession?.status === SessionStatus.PAUSED

  const progress = currentSession 
    ? isTimeTrackingSession
      ? Math.min(100, (timerDisplaySeconds / timeTrackerDurationSeconds) * 100)
      : ((currentSession.duration * 60 - timeRemaining) / (currentSession.duration * 60)) * 100
    : 0

  const circumference = 2 * Math.PI * 54
  const offset = circumference * (1 - progress / 100)

  return (
    <div className="flex flex-col items-center" data-timer-panel>
      <TaskPicker
        sessionType={activeSessionType}
        isDisabled={isTaskPickerDisabled}
        isOpen={isTaskMenuOpen}
        onToggle={() => setIsTaskMenuOpen((state) => !state)}
        onClose={() => setIsTaskMenuOpen(false)}
        taskPickerRef={taskPickerRef}
        selectedTask={selectedTask}
        onSelectTask={handleTaskSelect}
        filteredTaskOptions={filteredTaskOptions}
        taskSearch={taskSearch}
        onTaskSearchChange={setTaskSearch}
        hasTaskOptions={taskOptions.length > 0}
      />

      {/* Timer Container */}
      <div className="relative mb-6 sm:mb-8">
        <svg className="w-64 h-64 sm:w-80 sm:h-80 timer-ring" viewBox="0 0 120 120">
          <circle 
            cx="60" 
            cy="60" 
            r="54" 
            fill="none" 
            className="stroke-gray-200 dark:stroke-slate-700"
            strokeWidth="8"
          />
          <circle 
            cx="60" 
            cy="60" 
            r="54" 
            fill="none" 
            stroke={
              activeSessionType === SessionType.WORK 
                ? '#ef4444' 
                : activeSessionType === SessionType.SHORT_BREAK 
                ? '#22c55e' 
                : activeSessionType === SessionType.TIME_TRACKING
                ? '#6366f1'
                : '#3b82f6'
            }
            strokeWidth="8" 
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-4xl sm:text-6xl font-bold mb-2 ${
            activeSessionType === SessionType.WORK 
              ? 'text-red-500 dark:text-red-400' 
              : activeSessionType === SessionType.SHORT_BREAK 
              ? 'text-green-500 dark:text-green-400' 
              : activeSessionType === SessionType.TIME_TRACKING
              ? 'text-indigo-500 dark:text-indigo-400'
              : 'text-blue-500 dark:text-blue-400'
          }`}>
            {formatTime(timerDisplaySeconds)}
          </div>
          <div className="text-base sm:text-lg font-medium text-gray-600 dark:text-slate-300">
            {getSessionTypeLabel(activeSessionType)}
          </div>
        </div>
        <button
          type="button"
          onClick={openSettings}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
          aria-label="Adjust timer settings"
          title="Adjust timer settings"
        >
          <Settings size={18} />
        </button>
      </div>
      
      <TimerControls
        currentSession={currentSession}
        sessionType={activeSessionType}
        onSessionTypeChange={handleSessionTypeChange}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
        isStarting={isStarting}
        isStopping={isStopping}
        isPausing={isPausing}
        isResuming={isResuming}
        isRunning={isRunning}
        isPaused={isPaused}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settingsForm}
        onChange={handleSettingsChange}
        onSave={handleSettingsSave}
        onClose={() => setIsSettingsOpen(false)}
        isAutoStartEnabled={isAutoStartEnabled}
        onToggleAutoStart={() => setIsAutoStartEnabled((prev) => !prev)}
        isTimeTrackerMode={isTimeTrackerMode}
        onToggleTimeTrackerMode={() => setIsTimeTrackerMode(!isTimeTrackerMode)}
      />

    </div>
  )
}

export default function PomodoroTimer(props: PomodoroTimerProps) {
  return (
    <TimerErrorBoundary>
      <PomodoroTimerInner {...props} />
    </TimerErrorBoundary>
  )
}
