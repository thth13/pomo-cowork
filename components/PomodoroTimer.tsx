'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Square, RotateCcw, Settings } from 'lucide-react'
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
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    cancelSession,
    tick,
    restoreSession,
    previewSessionType,
    initializeWithSettings,
    setTimerSettings
  } = useTimerStore()

  const { user } = useAuthStore()
  const { emitSessionStart, emitSessionSync, emitSessionPause, emitSessionEnd, emitTimerTick } = useSocket()

  const [task, setTask] = useState('')
  const [sessionType, setSessionType] = useState<SessionType>(SessionType.WORK)
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)
  const [notificationEnabled, setNotificationEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [soundVolume, setSoundVolume] = useState(0.5)
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const completedSessionIdRef = useRef<string | null>(null)
  const lastActionTimeRef = useRef<number>(0)

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

  useEffect(() => {
    setSettingsForm({
      workDuration,
      shortBreak,
      longBreak,
    })
  }, [workDuration, shortBreak, longBreak])

  useEffect(() => {
    completedSessionIdRef.current = null
  }, [currentSession?.id])

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
            setTask(activeSession.task)
            setSessionType(activeSession.type as SessionType)
            
            // Emit to WebSocket to sync with others (without system message)
            const sessionData = {
              id: activeSession.id,
              task: activeSession.task,
              duration: activeSession.duration,
              type: activeSession.type,
              userId: user.id,
              username: user.username,
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
          // Обновляем время из Service Worker
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
          // Синхронизация состояния при подключении
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

  // Синхронизация с Service Worker при изменении состояния
  useEffect(() => {
    if (!currentSession) return

    // Запрашиваем текущее состояние из Service Worker
    sendMessageToServiceWorker({
      type: 'GET_STATE',
    })
  }, [currentSession])

  // Обновление title страницы с временем таймера
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

  // Локальный таймер для плавного обновления UI
  useEffect(() => {
    let localInterval: NodeJS.Timeout | undefined
    let syncInterval: NodeJS.Timeout | undefined

    if (isRunning && currentSession) {
      // Локальное обновление каждую секунду для плавности
      localInterval = setInterval(() => {
        const session = useTimerStore.getState().currentSession
        const running = useTimerStore.getState().isRunning
        
        if (session && running) {
          const startTime = new Date(session.startedAt).getTime()
          const now = Date.now()
          const elapsed = Math.floor((now - startTime) / 1000)
          const totalDuration = session.duration * 60
          const actualTimeRemaining = Math.max(0, totalDuration - elapsed)
          
          // Обновляем время каждую секунду
          useTimerStore.setState({ timeRemaining: actualTimeRemaining })
          
          if (actualTimeRemaining === 0) {
            handleSessionComplete()
          }
        }
      }, 1000)

      // Синхронизация с Service Worker каждые 5 секунд
      syncInterval = setInterval(() => {
        const session = useTimerStore.getState().currentSession
        const running = useTimerStore.getState().isRunning
        
        if (session && running) {
          const startTime = new Date(session.startedAt).getTime()
          const now = Date.now()
          const elapsed = Math.floor((now - startTime) / 1000)
          const totalDuration = session.duration * 60
          const actualTimeRemaining = Math.max(0, totalDuration - elapsed)
          
          // Синхронизируем Service Worker
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

  const handleSessionTypeChange = (type: SessionType) => {
    if (currentSession) return
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
    
    // if (!task.trim() && sessionType === SessionType.WORK) {
    //   alert('Please specify what you\'re working on')
    //   return
    // }

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
      const taskName = task.trim() || getSessionTypeLabel(sessionType)

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
        username
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
    
    lastActionTimeRef.current = now
    setIsStopping(true)

    try {
      if (currentSession) {
        const sessionId = currentSession.id
        
        // Optimistically stop timer immediately
        cancelSession()
        setTask('')
        
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
        setTask('')
      }
    } finally {
      // Add minimum delay to prevent too rapid clicks
      setTimeout(() => {
        setIsStopping(false)
      }, 500)
    }
  }

  const handleSessionComplete = async () => {
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
    
    // Clear task if we're going to a break
    if (nextType === SessionType.SHORT_BREAK || nextType === SessionType.LONG_BREAK) {
      setTask('')
    } else if (nextType === SessionType.WORK) {
      // Set default task for auto-started work sessions
      setTask('Work Session')
    }

    if (onSessionComplete) {
      onSessionComplete()
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

    // Auto-start next session after a brief delay
    setTimeout(async () => {
      const duration = getSessionDuration(nextType)
      const taskName = nextType === SessionType.WORK 
        ? 'Work Session' 
        : getSessionTypeLabel(nextType)

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
          type: nextType
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
          
          startSession(taskName, duration, nextType, dbSession.id)
          
          // Start Service Worker timer
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
            type: nextType,
            userId,
            username,
            timeRemaining: duration * 60,
            startedAt: dbSession.startedAt
          }
          
          emitSessionStart(sessionData)
        } else {
          startSession(taskName, duration, nextType)
        }
      } catch (error) {
        console.error('Failed to auto-start session:', error)
        startSession(taskName, duration, nextType)
      }
    }, 1000) // 1 second delay to show notification
  }

  const handleReset = () => {
    if (currentSession) {
      // Stop Service Worker timer
      sendMessageToServiceWorker({
        type: 'STOP_TIMER',
      })
      
  emitSessionEnd(currentSession.id, 'reset')
    }
    cancelSession()
    setTask('')
    setSessionType(SessionType.WORK)
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
      {/* Timer Container */}
      <div className="relative mb-8">
        <svg className="w-80 h-80 timer-ring" viewBox="0 0 120 120">
          <circle 
            cx="60" 
            cy="60" 
            r="54" 
            fill="none" 
            stroke="#f3f4f6" 
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
          <div className={`text-6xl font-bold mb-2 ${
            activeSessionType === SessionType.WORK 
              ? 'text-red-500' 
              : activeSessionType === SessionType.SHORT_BREAK 
              ? 'text-green-500' 
              : 'text-blue-500'
          }`}>
            {formatTime(timeRemaining)}
          </div>
          <div className="text-lg font-medium text-gray-600">
            {getSessionTypeLabel(activeSessionType)}
          </div>
        </div>
      </div>
      
      {/* Timer Controls */}
      <div className="flex items-center space-x-6 mb-8">
        {!currentSession ? (
          <button 
            onClick={handleStart}
            disabled={isStarting}
            className={`bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-xl font-medium transition-colors flex items-center space-x-2 ${
              isStarting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Play size={20} />
            <span>{isStarting ? 'Начинается...' : 'Начать'}</span>
          </button>
        ) : (
          <button 
            onClick={handleStop}
            disabled={isStopping}
            className={`bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-xl font-medium transition-colors flex items-center space-x-2 ${
              isStopping ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Square size={20} />
            <span>{isStopping ? 'Останавливается...' : 'Стоп'}</span>
          </button>
        )}
      </div>
      
      {/* Timer Tabs */}
      <div className="flex bg-white rounded-xl p-1 border border-gray-200 mb-8">
        <button 
          onClick={() => handleSessionTypeChange(SessionType.WORK)}
          disabled={!!currentSession}
          className={`px-6 py-2 rounded-lg font-medium ${
            sessionType === SessionType.WORK
              ? 'bg-red-500 text-white'
              : 'text-gray-600 hover:text-gray-900'
          } ${currentSession ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Фокус
        </button>
        <button 
          onClick={() => handleSessionTypeChange(SessionType.SHORT_BREAK)}
          disabled={!!currentSession}
          className={`px-6 py-2 rounded-lg font-medium ${
            sessionType === SessionType.SHORT_BREAK
              ? 'bg-red-500 text-white'
              : 'text-gray-600 hover:text-gray-900'
          } ${currentSession ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Короткий перерыв
        </button>
        <button 
          onClick={() => handleSessionTypeChange(SessionType.LONG_BREAK)}
          disabled={!!currentSession}
          className={`px-6 py-2 rounded-lg font-medium ${
            sessionType === SessionType.LONG_BREAK
              ? 'bg-red-500 text-white'
              : 'text-gray-600 hover:text-gray-900'
          } ${currentSession ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Длинный перерыв
        </button>
      </div>

      {/* Task Input */}
      {sessionType === SessionType.WORK && !currentSession && (
        <div className="w-full max-w-md">
          <input
            type="text"
            placeholder="Над чем вы работаете?"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            className="input w-full"
            maxLength={100}
          />
        </div>
      )}
    </div>
  )
}
