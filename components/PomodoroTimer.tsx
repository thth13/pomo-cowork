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
    restoreSession
  } = useTimerStore()

  const { user } = useAuthStore()
  const { emitSessionStart, emitSessionPause, emitSessionEnd, emitTimerTick } = useSocket()

  const [task, setTask] = useState('')
  const [sessionType, setSessionType] = useState<SessionType>(SessionType.WORK)

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
            // Restore session state
            restoreSession(activeSession)
            setTask(activeSession.task)
            setSessionType(activeSession.type as SessionType)
            
            // Calculate current time remaining
            const startTime = new Date(activeSession.startedAt).getTime()
            const now = Date.now()
            const elapsed = Math.floor((now - startTime) / 1000)
            const totalDuration = activeSession.duration * 60
            const currentTimeRemaining = Math.max(0, totalDuration - elapsed)
            
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

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined

    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        tick()
        // Only emit timer tick every 30 seconds to reduce WebSocket traffic
        if (currentSession && timeRemaining % 30 === 0) {
          emitTimerTick(currentSession.id, timeRemaining - 1)
        }
      }, 1000)
    } else if (timeRemaining === 0 && currentSession) {
      handleSessionComplete()
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeRemaining, currentSession, tick, emitTimerTick])

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

  const getNextSessionType = (): SessionType => {
    if (completedSessions > 0 && completedSessions % longBreakAfter === 0) {
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
    if (!task.trim() && sessionType === SessionType.WORK) {
      alert('Please specify what you\'re working on')
      return
    }

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
    setTask('')

    if (onSessionComplete) {
      onSessionComplete()
    }

    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Pomodoro completed!', {
        body: `Time for ${getSessionTypeLabel(nextType).toLowerCase()}`,
        icon: '/favicon.ico'
      })
    }
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
              onClick={() => !currentSession && setSessionType(type)}
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
                  sessionType === SessionType.WORK
                    ? 'text-primary-500'
                    : sessionType === SessionType.SHORT_BREAK
                    ? 'text-secondary-500'
                    : 'text-blue-500'
                }`}
                strokeLinecap="round"
              />
            </svg>
            
            {/* Time Display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-4xl font-bold ${getSessionTypeColor(sessionType)}`}>
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {getSessionTypeLabel(sessionType)}
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
