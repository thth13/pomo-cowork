'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Square, RotateCcw } from 'lucide-react'
import { useTimerStore } from '@/store/useTimerStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useSocket } from '@/hooks/useSocket'
import { SessionType } from '@/types'
import { getOrCreateAnonymousId, getAnonymousUsername } from '@/lib/anonymousUser'
import { buildAnonymousProfile } from '@/lib/anonymousProfile'
import { playStartSound, playEndSound } from '@/lib/notificationSound'

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
    initializeWithSettings
  } = useTimerStore()

  const { user } = useAuthStore()
  const { emitSessionStart, emitSessionPause, emitSessionEnd, emitTimerTick } = useSocket()

  const [task, setTask] = useState('')
  const [sessionType, setSessionType] = useState<SessionType>(SessionType.WORK)
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)
  const [notificationEnabled, setNotificationEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [soundVolume, setSoundVolume] = useState(0.5)

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
            
            // Emit to WebSocket to sync with others
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
            emitSessionStart(sessionData)
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

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    let checkInterval: NodeJS.Timeout | undefined

    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        tick()
        // Only emit timer tick every 30 seconds to reduce WebSocket traffic
        if (currentSession && timeRemaining % 30 === 0) {
          emitTimerTick(currentSession.id, timeRemaining - 1)
        }
      }, 1000)

      // Fallback check every 5 seconds - works even in background tabs
      checkInterval = setInterval(() => {
        const session = useTimerStore.getState().currentSession
        const running = useTimerStore.getState().isRunning
        
        if (session && running) {
          const startTime = new Date(session.startedAt).getTime()
          const now = Date.now()
          const elapsed = Math.floor((now - startTime) / 1000)
          const totalDuration = session.duration * 60
          const actualTimeRemaining = Math.max(0, totalDuration - elapsed)
          
          if (actualTimeRemaining === 0) {
            handleSessionComplete()
          }
        }
      }, 5000)
    } else if (timeRemaining === 0 && currentSession && isRunning) {
      handleSessionComplete()
    }

    return () => {
      if (interval) clearInterval(interval)
      if (checkInterval) clearInterval(checkInterval)
    }
  }, [isRunning, timeRemaining, currentSession])

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
    // if (!task.trim() && sessionType === SessionType.WORK) {
    //   alert('Please specify what you\'re working on')
    //   return
    // }

    // If there's already an active session, end it first
    if (currentSession) {
      await handleStop()
    }

    const duration = getSessionDuration(sessionType)
    const taskName = task.trim() || getSessionTypeLabel(sessionType)

    // Get user ID or anonymous ID
    const userId = user?.id || getOrCreateAnonymousId()
    const username = user?.username || getAnonymousUsername()

    // Create session in database (works for both authenticated and anonymous)
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
        
        // Start local timer with database session ID
        startSession(taskName, duration, sessionType, dbSession.id)
        
        // Emit to WebSocket with session ID
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
        // Fallback to local-only timer if server fails
        startSession(taskName, duration, sessionType)
      }
    } catch (error) {
      console.error('Failed to create session:', error)
      // Fallback to local-only timer
      startSession(taskName, duration, sessionType)
    }
  }

  const handlePause = async () => {
    pauseSession()
    if (currentSession) {
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
      
      emitSessionStart({
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
    if (currentSession) {
      emitSessionEnd(currentSession.id)
      
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
          status: 'CANCELLED',
          endedAt: new Date().toISOString()
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
    cancelSession()
    setTask('')
  }

  const handleSessionComplete = async () => {
    const completedType = currentSession?.type
    
    if (currentSession) {
      emitSessionEnd(currentSession.id)
      
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

        await fetch(`/api/sessions/${currentSession.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body)
        })
      } catch (error) {
        console.error('Failed to update session:', error)
      }
    }
    
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
      new Notification('Pomodoro completed!', {
        body: `Starting ${getSessionTypeLabel(nextType).toLowerCase()}...`,
        icon: '/favicon.ico'
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
      emitSessionEnd(currentSession.id)
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

  return (
    <div className="card max-w-md mx-auto">
      <div className="text-center space-y-6">
        {/* Session Type Selector */}
        <div className="flex justify-center space-x-2">
          {Object.values(SessionType).map((type) => (
            <button
              key={type}
              onClick={() => handleSessionTypeChange(type)}
              disabled={!!currentSession}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                sessionType === type
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              } ${currentSession ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {getSessionTypeLabel(type)}
            </button>
          ))}
        </div>

        {/* Timer Display */}
        <div className="relative">
          <motion.div
            className="relative w-48 h-48 mx-auto"
            initial={{ scale: 0.9 }}
            animate={{ scale: isRunning ? 1.05 : 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Progress Ring */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="2"
                fill="transparent"
                className="text-slate-200"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="2"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                className={`transition-all duration-1000 ${
                  activeSessionType === SessionType.WORK
                    ? 'text-primary-500'
                    : activeSessionType === SessionType.SHORT_BREAK
                    ? 'text-secondary-500'
                    : 'text-blue-500'
                }`}
                strokeLinecap="round"
              />
            </svg>
            
            {/* Time Display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-4xl font-bold ${getSessionTypeColor(activeSessionType)}`}>
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {getSessionTypeLabel(activeSessionType)}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Task Input */}
        {sessionType === SessionType.WORK && (
          <div>
            <input
              type="text"
              placeholder="What are you working on?"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              disabled={!!currentSession}
              className="input w-full"
              maxLength={100}
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center space-x-3">
          {!currentSession ? (
            <motion.button
              onClick={handleStart}
              className="btn-primary flex items-center space-x-2 px-6 py-3"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play size={20} />
              <span>Start</span>
            </motion.button>
          ) : (
            <>
              <motion.button
                onClick={isRunning ? handlePause : handleResume}
                className="btn-secondary flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isRunning ? <Pause size={20} /> : <Play size={20} />}
                <span>{isRunning ? 'Pause' : 'Resume'}</span>
              </motion.button>
              
              <motion.button
                onClick={handleStop}
                className="btn-secondary flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Square size={20} />
                <span>Stop</span>
              </motion.button>
            </>
          )}
          
          <motion.button
            onClick={handleReset}
            className="btn-secondary flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RotateCcw size={20} />
            <span>Reset</span>
          </motion.button>
        </div>

        {/* Session Counter */}
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-700">{completedSessions}</div>
          <div className="text-sm text-slate-500">completed sessions</div>
        </div>
      </div>
    </div>
  )
}
