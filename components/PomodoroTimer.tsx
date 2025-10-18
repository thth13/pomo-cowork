'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Play, Pause, Square, RotateCcw, Settings, ChevronDown, Search, Check } from 'lucide-react'
import { useTimerStore } from '@/store/useTimerStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useSocket } from '@/hooks/useSocket'
import { SessionType } from '@/types'
import { getOrCreateAnonymousId, getAnonymousUsername } from '@/lib/anonymousUser'
import { playStartSound, playEndSound } from '@/lib/notificationSound'
import { sendMessageToServiceWorker, listenToServiceWorker } from '@/lib/serviceWorker'

// Wake Lock API types
interface WakeLockSentinel extends EventTarget {
  released: boolean
  type: 'screen'
  release(): Promise<void>
}

interface Navigator {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinel>
  }
}

interface PomodoroTimerProps {
  onSessionComplete?: () => void
}

export default function PomodoroTimer({ onSessionComplete }: PomodoroTimerProps) {
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
    tick,
    restoreSession,
    previewSessionType,
    initializeWithSettings,
    setTimerSettings,
    taskOptions,
  } = useTimerStore()

  const { user } = useAuthStore()
  const { emitSessionStart, emitSessionSync, emitSessionPause, emitSessionEnd, emitTimerTick } = useSocket()

  const [sessionType, setSessionType] = useState<SessionType>(SessionType.WORK)
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)
  const [notificationEnabled, setNotificationEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [soundVolume, setSoundVolume] = useState(0.5)
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isTaskMenuOpen, setIsTaskMenuOpen] = useState(false)
  const [taskSearch, setTaskSearch] = useState('')
  const [isAutoStartEnabled, setIsAutoStartEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pomodoro:autoStartEnabled')
      if (stored !== null) {
        return stored === 'true'
      }
    }

    return true
  })
  const completedSessionIdRef = useRef<string | null>(null)
  const lastActionTimeRef = useRef<number>(0)
  const taskPickerRef = useRef<HTMLDivElement | null>(null)
  const autoStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAutoStartTimeout = () => {
    if (autoStartTimeoutRef.current) {
      clearTimeout(autoStartTimeoutRef.current)
      autoStartTimeoutRef.current = null
    }
  }

  interface TimerSettingsForm {
    workDuration: number
    shortBreak: number
    longBreak: number
  }

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsForm, setSettingsForm] = useState<TimerSettingsForm>(() => ({
    workDuration,
    shortBreak,
    longBreak,
  }))

  const isTaskPickerDisabled = !!currentSession

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

  const handleTaskSelect = (taskOption: { id: string; title: string; description?: string } | null) => {
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
  }, [workDuration, shortBreak, longBreak])

  useEffect(() => {
    localStorage.setItem('pomodoro:autoStartEnabled', String(isAutoStartEnabled))
  }, [isAutoStartEnabled])

  useEffect(() => {
    if (!isAutoStartEnabled) {
      clearAutoStartTimeout()
    }
  }, [isAutoStartEnabled])

  useEffect(() => {
    return () => {
      clearAutoStartTimeout()
    }
  }, [])

  useEffect(() => {
    completedSessionIdRef.current = null
  }, [currentSession?.id])

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
    if (isTaskPickerDisabled && isTaskMenuOpen) {
      setIsTaskMenuOpen(false)
    }
  }, [isTaskPickerDisabled, isTaskMenuOpen])

  // Restore active session on component mount - ONLY ONCE
  useEffect(() => {
    if (!user || currentSession) return // Don't restore if already have session

    let isMounted = true

    const restoreActiveSession = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/sessions', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (response.ok && isMounted) {
          const sessions = await response.json()
          // Find active session
          const activeSession = sessions.find((s: any) => s.status === 'ACTIVE')
          
          if (activeSession && isMounted) {
            // Calculate current time remaining
            const startTime = new Date(activeSession.startedAt).getTime()
            const now = Date.now()
            const elapsed = Math.floor((now - startTime) / 1000)
            const totalDuration = activeSession.duration * 60
            const currentTimeRemaining = Math.max(0, totalDuration - elapsed)
            
            // Check if session expired
            if (currentTimeRemaining === 0) {
              // Complete expired session
              const headers: Record<string, string> = {
                'Content-Type': 'application/json'
              }
              
              if (token) {
                headers.Authorization = `Bearer ${token}`
              }
              
              const body: Record<string, any> = {
                status: 'COMPLETED',
                completedAt: new Date().toISOString(),
                endedAt: new Date().toISOString()
              }
              
              if (!user) {
                body.anonymousId = getOrCreateAnonymousId()
              }

              await fetch(`/api/sessions/${activeSession.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(body)
              })
              
              console.log('Expired session completed:', activeSession.id)
              return
            }
            
            // Restore session state if not expired
            restoreSession(activeSession)
            setSessionType(activeSession.type as SessionType)
            
            // Emit to WebSocket to sync with others (without system message)
            const sessionData = {
              id: activeSession.id,
              task: activeSession.task,
              duration: activeSession.duration,
              type: activeSession.type,
              userId: user.id,
              username: user.username,
              avatarUrl: user.avatarUrl,
              timeRemaining: currentTimeRemaining,
              startedAt: activeSession.startedAt
            }
            emitSessionSync(sessionData)
          }
        }
      } catch (error) {
        console.error('Failed to restore session:', error)
      }
    }

    restoreActiveSession()

    return () => {
      isMounted = false
    }
  }, [user?.id]) // Only depend on user ID, not the whole user object

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
    user?.settings?.notificationsEnabled,
    user?.settings?.soundEnabled,
    user?.settings?.soundVolume
  ])

  // Wake Lock API - keep tab active
  useEffect(() => {
    let lock: WakeLockSentinel | null = null

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isRunning && currentSession) {
        try {
          lock = await navigator.wakeLock.request('screen')
          
          // Handle wake lock release (browser may release it automatically)
          lock.addEventListener('release', () => {
            console.log('Wake Lock was released by browser')
            lock = null
          })
          
          setWakeLock(lock)
          console.log('Wake Lock acquired')
        } catch (err) {
          console.error('Wake Lock error:', err)
        }
      }
    }

    const releaseWakeLock = async () => {
      if (lock && !lock.released) {
        try {
          await lock.release()
          lock = null
          setWakeLock(null)
          console.log('Wake Lock released')
        } catch (err) {
          console.error('Wake Lock release error:', err)
        }
      }
    }

    if (isRunning && currentSession) {
      requestWakeLock()
    }

    return () => {
      releaseWakeLock()
    }
  }, [isRunning, currentSession])

  // Page Visibility API - recalculate time when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const session = useTimerStore.getState().currentSession
        const running = useTimerStore.getState().isRunning
        
        if (session && running) {
          // Recalculate time based on start time (startedAt already accounts for pauses)
          const startTime = new Date(session.startedAt).getTime()
          const now = Date.now()
          const elapsed = Math.floor((now - startTime) / 1000)
          const totalDuration = session.duration * 60
          const newTimeRemaining = Math.max(0, totalDuration - elapsed)
          
          const currentTimeRemaining = useTimerStore.getState().timeRemaining
          
          // Update store directly with calculated time
          if (Math.abs(newTimeRemaining - currentTimeRemaining) > 2) { // Allow 2 sec tolerance
            useTimerStore.setState({ timeRemaining: newTimeRemaining })
            console.log('Time recalculated on tab focus:', newTimeRemaining)
          }

          // Check if session completed while tab was hidden
          if (newTimeRemaining === 0) {
            handleSessionComplete()
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Service Worker message listener
  useEffect(() => {
    const unsubscribe = listenToServiceWorker((message) => {
      const { type, payload } = message

      switch (type) {
        case 'TIMER_TICK':
          // Update time from Service Worker
          if (currentSession && payload.sessionId === currentSession.id) {
            useTimerStore.setState({ timeRemaining: payload.timeRemaining })
            
            // Emit WebSocket tick every 30 seconds
            if (payload.timeRemaining % 30 === 0) {
              emitTimerTick(currentSession.id, payload.timeRemaining)
            }
          }
          break
        
        case 'TIMER_COMPLETE':
          if (payload.sessionId === currentSession?.id) {
            handleSessionComplete()
          }
          break
        
        case 'TIMER_STATE':
          // State synchronization on connection
          if (payload.isRunning && payload.sessionId === currentSession?.id) {
            useTimerStore.setState({ 
              timeRemaining: payload.timeRemaining,
              isRunning: payload.isRunning 
            })
          }
          break
      }
    })

    return unsubscribe
  }, [currentSession, emitTimerTick])

  // Synchronize with Service Worker on state change
  useEffect(() => {
    if (!currentSession) return

    // Request current state from Service Worker
    sendMessageToServiceWorker({
      type: 'GET_STATE',
    })
  }, [currentSession])

  // Update page title with timer time
  useEffect(() => {
    if (isRunning && currentSession && timeRemaining > 0) {
      const timeStr = formatTime(timeRemaining)
      const sessionLabel = getSessionTypeLabel(currentSession.type as SessionType)
      document.title = `${timeStr} - ${sessionLabel} | Pomodoro`
    } else {
      document.title = 'Pomodoro Timer'
    }

    return () => {
      document.title = 'Pomodoro Timer'
    }
  }, [isRunning, currentSession, timeRemaining])

  // Local timer for smooth UI updates
  useEffect(() => {
    let localInterval: NodeJS.Timeout | undefined
    let syncInterval: NodeJS.Timeout | undefined

    if (isRunning && currentSession) {
      // Local update every second for smoothness
      localInterval = setInterval(() => {
        const session = useTimerStore.getState().currentSession
        const running = useTimerStore.getState().isRunning
        
        if (session && running) {
          const startTime = new Date(session.startedAt).getTime()
          const now = Date.now()
          const elapsed = Math.floor((now - startTime) / 1000)
          const totalDuration = session.duration * 60
          const actualTimeRemaining = Math.max(0, totalDuration - elapsed)
          
          // Update time every second
          useTimerStore.setState({ timeRemaining: actualTimeRemaining })
          
          if (actualTimeRemaining === 0) {
            handleSessionComplete()
          }
        }
      }, 1000)

      // Synchronize with Service Worker every 5 seconds
      syncInterval = setInterval(() => {
        const session = useTimerStore.getState().currentSession
        const running = useTimerStore.getState().isRunning
        
        if (session && running) {
          const startTime = new Date(session.startedAt).getTime()
          const now = Date.now()
          const elapsed = Math.floor((now - startTime) / 1000)
          const totalDuration = session.duration * 60
          const actualTimeRemaining = Math.max(0, totalDuration - elapsed)
          
          // Synchronize Service Worker
          sendMessageToServiceWorker({
            type: 'SYNC_TIME',
            payload: {
              timeRemaining: actualTimeRemaining,
              isRunning: running,
            },
          })
        }
      }, 5000)
    }

    return () => {
      if (localInterval) clearInterval(localInterval)
      if (syncInterval) clearInterval(syncInterval)
    }
  }, [isRunning, currentSession])

  const getSessionDuration = (type: SessionType): number => {
    switch (type) {
      case SessionType.WORK:
        return workDuration
      case SessionType.SHORT_BREAK:
        return shortBreak
      case SessionType.LONG_BREAK:
        return longBreak
      default:
        return workDuration
    }
  }

  const initiateSession = async (type: SessionType): Promise<void> => {
    const duration = getSessionDuration(type)
    const taskName = type === SessionType.WORK
      ? selectedTask?.title || 'Work Session'
      : getSessionTypeLabel(type)

    const userId = user?.id || getOrCreateAnonymousId()
    const username = user?.username || getAnonymousUsername()

    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const body: Record<string, any> = {
        task: taskName,
        duration,
        type
      }

      if (!user) {
        body.anonymousId = userId
      }

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })

      if (response.ok) {
        const dbSession = await response.json()

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
          startedAt: dbSession.startedAt
        }

        emitSessionStart(sessionData)
      } else {
        startSession(taskName, duration, type)
      }
    } catch (error) {
      console.error('Failed to initiate session:', error)
      startSession(taskName, duration, type)
    }
  }

  const handleSessionTypeChange = (type: SessionType) => {
    if (currentSession) return
    clearAutoStartTimeout()
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
    setSettingsForm((prev) => ({
      ...prev,
      [key]: value,
    }))
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

  const getNextSessionType = (): SessionType => {
    // Calculate based on the number of completed sessions AFTER this one
    const nextCompletedCount = completedSessions + 1
    if (nextCompletedCount % longBreakAfter === 0) {
      return SessionType.LONG_BREAK
    }
    return sessionType === SessionType.WORK ? SessionType.SHORT_BREAK : SessionType.WORK
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleStart = async () => {
    const now = Date.now()
    
    // Prevent multiple rapid clicks (debounce 1 second)
    if (isStarting || now - lastActionTimeRef.current < 1000) return
    
    lastActionTimeRef.current = now
    
    clearAutoStartTimeout()

    setIsStarting(true)

    try {
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
          const token = localStorage.getItem('token')
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          }
          
          if (token) {
            headers.Authorization = `Bearer ${token}`
          }
          
          const body: Record<string, any> = {
            status: 'CANCELLED',
            endedAt: new Date().toISOString()
          }
          
          if (!user) {
            body.anonymousId = getOrCreateAnonymousId()
          }

          await fetch(`/api/sessions/${sessionId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body)
          })
        } catch (error) {
          console.error('Failed to update previous session:', error)
        }
      }

      const duration = getSessionDuration(sessionType)
      const taskName = selectedTask?.title || getSessionTypeLabel(sessionType)

      // Get user ID or anonymous ID
      const userId = user?.id || getOrCreateAnonymousId()
      const username = user?.username || getAnonymousUsername()

      // Create session in database first
      try {
        const token = localStorage.getItem('token')
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        }
        
        if (token) {
          headers.Authorization = `Bearer ${token}`
        }

        const body: Record<string, any> = {
          task: taskName,
          duration,
          type: sessionType
        }
        
        if (!user) {
          body.anonymousId = userId
        }

        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        })

        if (response.ok) {
          const dbSession = await response.json()
          
          // Start timer with real session ID
          startSession(taskName, duration, sessionType, dbSession.id)
          
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
            type: sessionType,
            userId,
            username,
            avatarUrl: user?.avatarUrl,
            timeRemaining: duration * 60,
            startedAt: dbSession.startedAt
          }
          
          emitSessionStart(sessionData)
        } else {
          throw new Error('Failed to create session')
        }
      } catch (error) {
        console.error('Failed to create session:', error)
        // Fallback: start with temporary ID
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        startSession(taskName, duration, sessionType, tempId)
        
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
    clearAutoStartTimeout()
    pauseSession()
    if (currentSession) {
      // Pause Service Worker timer
      sendMessageToServiceWorker({
        type: 'PAUSE_TIMER',
      })
      
      emitSessionPause(currentSession.id)
      
      // Update session in database
      try {
        const token = localStorage.getItem('token')
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        }
        
        if (token) {
          headers.Authorization = `Bearer ${token}`
        }
        
        const body: Record<string, any> = {
          status: 'PAUSED'
        }
        
        if (!user) {
          body.anonymousId = getOrCreateAnonymousId()
        }

        await fetch(`/api/sessions/${currentSession.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body)
        })
      } catch (error) {
        console.error('Failed to update session:', error)
      }
    }
  }

  const handleResume = async () => {
    clearAutoStartTimeout()
    resumeSession()
    if (currentSession) {
      const username = user?.username || getAnonymousUsername()
      
      // Resume Service Worker timer
      sendMessageToServiceWorker({
        type: 'RESUME_TIMER',
        payload: {
          timeRemaining,
          startedAt: currentSession.startedAt,
        },
      })
      
      // Use sync instead of start for resuming
      emitSessionSync({
        ...currentSession,
        duration: currentSession.duration,
        timeRemaining,
        username,
        avatarUrl: user?.avatarUrl
      })
      
      // Update session in database
      try {
        const token = localStorage.getItem('token')
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        }
        
        if (token) {
          headers.Authorization = `Bearer ${token}`
        }
        
        const body: Record<string, any> = {
          status: 'ACTIVE'
        }
        
        if (!user) {
          body.anonymousId = getOrCreateAnonymousId()
        }

        await fetch(`/api/sessions/${currentSession.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body)
        })
      } catch (error) {
        console.error('Failed to update session:', error)
      }
    }
  }

  const handleStop = async () => {
    const now = Date.now()
    
    // Prevent multiple rapid clicks (debounce 1 second)
    if (isStopping || now - lastActionTimeRef.current < 1000) return
    
    clearAutoStartTimeout()

    const previousSessionType = currentSession?.type ?? sessionType

    lastActionTimeRef.current = now
    setIsStopping(true)

    try {
      if (currentSession) {
        const sessionId = currentSession.id
        
        // Optimistically stop timer immediately
        cancelSession()
        
        // Stop Service Worker timer
        sendMessageToServiceWorker({
          type: 'STOP_TIMER',
        })
        
        emitSessionEnd(sessionId, 'manual')
        
        // Update session in database in background
        try {
          const token = localStorage.getItem('token')
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          }
          
          if (token) {
            headers.Authorization = `Bearer ${token}`
          }
          
          const body: Record<string, any> = {
            status: 'CANCELLED',
            endedAt: new Date().toISOString()
          }
          
          if (!user) {
            body.anonymousId = getOrCreateAnonymousId()
          }

          await fetch(`/api/sessions/${sessionId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body)
          })
        } catch (error) {
          console.error('Failed to update session:', error)
        }
      } else {
        cancelSession()
      }
    } finally {
      if (previousSessionType !== SessionType.WORK) {
        setSessionType(SessionType.WORK)
        previewSessionType(SessionType.WORK)
      }

      // Add minimum delay to prevent too rapid clicks
      setTimeout(() => {
        setIsStopping(false)
      }, 500)
    }
  }

  const handleSessionComplete = async () => {
    clearAutoStartTimeout()
    if (!currentSession) {
      return
    }

    if (completedSessionIdRef.current === currentSession.id) {
      return
    }

    completedSessionIdRef.current = currentSession.id

    const completedType = currentSession.type
    const sessionSnapshot = currentSession
    
    // Complete the current session in the database
    if (sessionSnapshot) {
      // Update session in database
      try {
        const token = localStorage.getItem('token')
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        }
        
        if (token) {
          headers.Authorization = `Bearer ${token}`
        }
        
        const body: Record<string, any> = {
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
          endedAt: new Date().toISOString()
        }
        
        if (!user) {
          body.anonymousId = getOrCreateAnonymousId()
        }

        await fetch(`/api/sessions/${sessionSnapshot.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body)
        })

        // Increment task pomodoro counter if it's a work session and a task is selected
        console.log('Checking pomodoro increment conditions:', {
          completedType,
          isWork: completedType === SessionType.WORK,
          selectedTask,
          hasToken: !!token
        })
        
        if (
          completedType === SessionType.WORK &&
          selectedTask &&
          selectedTask.id &&
          token
        ) {
          try {
            console.log('Incrementing pomodoro for task:', selectedTask.id)
            const response = await fetch(`/api/tasks/${selectedTask.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ 
                incrementPomodoro: true 
              })
            })
            
            if (!response.ok) {
              throw new Error(`Server returned ${response.status}`)
            }
            
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
    }
    
    // End current session (completed, not manual stop)
    emitSessionEnd(sessionSnapshot.id, 'completed')
    
    completeSession()

    // Auto-switch to next session type
    const nextType = getNextSessionType()
    setSessionType(nextType)

    const storeState = useTimerStore.getState()
    const pendingSession = storeState.currentSession
    const pendingTime = storeState.timeRemaining

    if (!pendingSession && pendingTime !== getSessionDuration(nextType) * 60) {
      previewSessionType(nextType)
    }

    // Clear task if we're going to a break
    if (nextType === SessionType.SHORT_BREAK || nextType === SessionType.LONG_BREAK) {
    } else if (nextType === SessionType.WORK) {
      // Set default task for auto-started work sessions
    }

    if (onSessionComplete) {
      console.log('Calling onSessionComplete callback')
      await onSessionComplete()
      console.log('onSessionComplete callback finished')
    }

    // Show notification
    if (
      notificationEnabled &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification('Pomodoro completed! 🍅', {
        body: `Starting ${getSessionTypeLabel(nextType).toLowerCase()}...`,
        icon: '/icons/favicon-192.png',
        badge: '/icons/favicon-32.png',
      })
    }

    if (soundEnabled) {
      console.log('Sound enabled, nextType:', nextType, 'volume:', soundVolume)
      // If going to a break, play break-start sound
      // If going back to work, play break-end sound
      if (nextType === SessionType.SHORT_BREAK || nextType === SessionType.LONG_BREAK) {
        console.log('Playing break-start sound')
        playStartSound(soundVolume).catch((error) => {
          console.error('Failed to play start sound:', error)
        })
      } else {
        console.log('Playing break-end sound')
        playEndSound(soundVolume).catch((error) => {
          console.error('Failed to play end sound:', error)
        })
      }
    } else {
      console.log('Sound is disabled')
    }

    const scheduleAutoStart = () => {
      clearAutoStartTimeout()

      autoStartTimeoutRef.current = setTimeout(async () => {
        if (!isAutoStartEnabled) {
          clearAutoStartTimeout()
          return
        }

        await initiateSession(nextType)
      }, 1200)
    }

    if (isAutoStartEnabled) {
      scheduleAutoStart()
      return
    }

    clearAutoStartTimeout()

    previewSessionType(nextType)
  }

  const getSessionTypeLabel = (type: SessionType): string => {
    switch (type) {
      case SessionType.WORK:
        return 'Work'
      case SessionType.SHORT_BREAK:
        return 'Short break'
      case SessionType.LONG_BREAK:
        return 'Long break'
      default:
        return 'Work'
    }
  }

  const getSessionTypeColor = (type: SessionType): string => {
    switch (type) {
      case SessionType.WORK:
        return 'text-primary-600'
      case SessionType.SHORT_BREAK:
        return 'text-secondary-600'
      case SessionType.LONG_BREAK:
        return 'text-blue-600'
      default:
        return 'text-primary-600'
    }
  }

  const activeSessionType = currentSession?.type ?? sessionType

  const progress = currentSession 
    ? ((currentSession.duration * 60 - timeRemaining) / (currentSession.duration * 60)) * 100
    : 0

  const circumference = 2 * Math.PI * 54
  const offset = circumference * (1 - progress / 100)

  return (
    <div className="flex flex-col items-center" data-timer-panel>
      {/* Current Task Display */}
      {sessionType === SessionType.WORK && (
        <div className="mb-6 sm:mb-8 w-full max-w-md px-4 sm:px-0">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Current Task
          </label>
          <div className="relative" ref={taskPickerRef}>
            <button
              type="button"
              onClick={() => !isTaskPickerDisabled && setIsTaskMenuOpen((state) => !state)}
              disabled={isTaskPickerDisabled}
              className={`group w-full rounded-xl border px-4 py-3 text-left text-sm transition focus:outline-none focus:ring-0 ${
                isTaskPickerDisabled
                  ? 'cursor-not-allowed opacity-70 border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500'
                  : `border-gray-200 dark:border-slate-700 ${
                      isTaskMenuOpen
                        ? 'shadow-sm shadow-blue-500/10 dark:shadow-blue-900/20 border-blue-400 dark:border-blue-500'
                        : 'hover:border-blue-300 dark:hover:border-blue-500'
                    }`
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-gray-700 dark:text-slate-200">
                  {selectedTask ? selectedTask.title : 'Select a task from the list'}
                </span>
                <motion.span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition group-hover:bg-blue-100 group-hover:text-blue-600 dark:bg-slate-700 dark:text-slate-300 dark:group-hover:bg-blue-900/40 dark:group-hover:text-blue-300"
                  animate={{ rotate: isTaskMenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <ChevronDown size={16} />
                </motion.span>
              </div>
              <motion.div
                className={`absolute inset-x-4 bottom-0 h-0.5 rounded-full ${
                  isTaskMenuOpen
                    ? 'bg-blue-500/70 dark:bg-blue-400/70'
                    : selectedTask
                      ? 'bg-gray-200 dark:bg-slate-700'
                      : 'bg-transparent'
                }`}
                layoutId="taskHighlight"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            </button>

            <AnimatePresence>
              {isTaskMenuOpen && !isTaskPickerDisabled && (
                <motion.div
                  key="task-dropdown"
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="absolute z-30 mt-3 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900"
                >
                  {/* <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-3 text-xs text-gray-400 dark:border-slate-800 dark:text-slate-500">
                    <Search size={14} />
                    <input
                      autoFocus
                      value={taskSearch}
                      onChange={(event) => setTaskSearch(event.target.value)}
                      placeholder="Find task..."
                      className="w-full bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400 dark:text-slate-200 dark:placeholder:text-slate-500"
                    />
                  </div> */}

                  <div className="max-h-64 overflow-y-auto py-2">
                    <button
                      type="button"
                      onClick={() => handleTaskSelect(null)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition ${
                        !selectedTask
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300'
                          : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                    >
                      {/* <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-current text-[10px] font-medium uppercase">
                        Any
                      </span> */}
                      <div className="flex flex-col">
                        <span className="font-medium">No task selected</span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">Timer will run without task binding</span>
                      </div>
                    </button>

                    {filteredTaskOptions.length ? (
                      filteredTaskOptions.map((taskOption) => {
                        const isActive = selectedTask?.id === taskOption.id
                        return (
                          <button
                            type="button"
                            key={taskOption.id}
                            onClick={() => handleTaskSelect(taskOption)}
                            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                              isActive
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300'
                                : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {/* <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                              taskOption.completed
                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {taskOption.completed ? <Check size={14} /> : taskOption.title.slice(0, 1).toUpperCase()}
                            </span> */}
                            <div className="flex flex-1 flex-col">
                              <span className="truncate text-sm font-medium">
                                {taskOption.title}
                              </span>
                              {taskOption.description && (
                                <span className="line-clamp-2 text-xs text-gray-400 dark:text-slate-400">
                                  {taskOption.description}
                                </span>
                              )}
                            </div>
                            {isActive && (
                              <span className="mt-1 shrink-0 rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
                                Active
                              </span>
                            )}
                          </button>
                        )
                      })
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-slate-500">
                        No tasks match your search.
                      </div>
                    )}
                  </div>

                  {!taskOptions.length && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                      Add tasks in the list to populate this menu.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {selectedTask?.description && (
                <motion.div
                  key="task-description"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-600 dark:border-blue-900/60 dark:bg-blue-900/20 dark:text-blue-300"
                >
                  {selectedTask.description}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

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
              : 'text-blue-500 dark:text-blue-400'
          }`}>
            {formatTime(timeRemaining)}
          </div>
          <div className="text-base sm:text-lg font-medium text-gray-600 dark:text-slate-300">
            {getSessionTypeLabel(activeSessionType)}
          </div>
        </div>
      </div>
      
      {/* Timer Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-6 sm:mb-8 px-4 sm:px-0 w-full sm:w-auto">
        {!currentSession ? (
          <button 
            onClick={handleStart}
            disabled={isStarting}
            className={`w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white px-6 sm:px-8 py-3 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2 ${
              isStarting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Play size={20} />
            <span>{isStarting ? 'Starting...' : 'Start'}</span>
          </button>
        ) : (
          <button 
            onClick={handleStop}
            disabled={isStopping}
            className={`w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2 ${
              isStopping ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Square size={20} />
            <span>{isStopping ? 'Stopping...' : 'Stop'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={openSettings}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Settings size={20} />
          <span>Adjust time</span>
        </button>

        <button
          type="button"
          onClick={() => setIsAutoStartEnabled((prev) => !prev)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            isAutoStartEnabled
              ? 'border-emerald-400 bg-emerald-600 text-white shadow-[0_8px_20px_-10px_rgba(16,185,129,0.7)] focus-visible:ring-emerald-500'
              : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-100 focus-visible:ring-gray-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
          aria-pressed={isAutoStartEnabled}
          title={isAutoStartEnabled ? 'Автостарт включен' : 'Автостарт выключен'}
        >
          <span
            className={`relative flex items-center justify-center w-7 h-7 rounded-full border text-[10px] font-bold ${
              isAutoStartEnabled
                ? 'border-emerald-300 bg-white text-emerald-600'
                : 'border-gray-200 bg-white text-gray-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400'
            }`}
          >
            {isAutoStartEnabled ? 'ON' : 'OFF'}
          </span>
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
            Auto Start
          </span>
        </button>
      </div>
      
      {/* Timer Tabs */}
      <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 border border-gray-200 dark:border-slate-700 mb-4 sm:mb-6 mx-4 sm:mx-0">
        <button 
          onClick={() => handleSessionTypeChange(SessionType.WORK)}
          disabled={!!currentSession}
          className={`flex-1 sm:flex-none sm:px-6 px-3 py-2 rounded-lg font-medium text-sm sm:text-base ${
            sessionType === SessionType.WORK
              ? 'bg-red-500 text-white'
              : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
          } ${currentSession ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Focus
        </button>
        <button 
          onClick={() => handleSessionTypeChange(SessionType.SHORT_BREAK)}
          disabled={!!currentSession}
          className={`flex-1 sm:flex-none sm:px-6 px-3 py-2 rounded-lg font-medium text-sm sm:text-base ${
            sessionType === SessionType.SHORT_BREAK
              ? 'bg-red-500 text-white'
              : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
          } ${currentSession ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Short Break
        </button>
        <button 
          onClick={() => handleSessionTypeChange(SessionType.LONG_BREAK)}
          disabled={!!currentSession}
          className={`flex-1 sm:flex-none sm:px-6 px-3 py-2 rounded-lg font-medium text-sm sm:text-base ${
            sessionType === SessionType.LONG_BREAK
              ? 'bg-red-500 text-white'
              : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
          } ${currentSession ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Long Break
        </button>
      </div>

      {/* Auto-start Toggle */}
      <div className="hidden" />

      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-700 p-6 space-y-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Timer settings</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">Adjust durations in minutes for each session type</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Focus length</span>
                <input
                  type="number"
                  min={1}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  value={settingsForm.workDuration}
                  onChange={(event) => handleSettingsChange('workDuration', Number(event.target.value))}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Short break</span>
                <input
                  type="number"
                  min={1}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  value={settingsForm.shortBreak}
                  onChange={(event) => handleSettingsChange('shortBreak', Number(event.target.value))}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Long break</span>
                <input
                  type="number"
                  min={1}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  value={settingsForm.longBreak}
                  onChange={(event) => handleSettingsChange('longBreak', Number(event.target.value))}
                />
              </label>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSettingsSave}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
