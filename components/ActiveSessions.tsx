'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Clock, User, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTimerStore } from '@/store/useTimerStore'
import { useAuthStore } from '@/store/useAuthStore'
import { SessionType, ActiveSession } from '@/types'

// Component for individual session with time updates
function SessionCard({ session, index, isCurrentUser = false }: { 
  session: ActiveSession; 
  index: number; 
  isCurrentUser?: boolean;
}) {
  const router = useRouter()
  
  // Calculate time remaining based on timestamp - always accurate
  const getTimeRemaining = useCallback(() => {
    const startTime = new Date(session.startedAt).getTime()
    const now = Date.now()
    const elapsed = Math.floor((now - startTime) / 1000) // seconds
    const totalDuration = (session.duration || 25) * 60 // minutes to seconds
    return Math.max(0, totalDuration - elapsed)
  }, [session.startedAt, session.duration])

  const [currentTimeRemaining, setCurrentTimeRemaining] = useState(() => getTimeRemaining())

  // Recalculate when session changes
  useEffect(() => {
    setCurrentTimeRemaining(getTimeRemaining())
  }, [getTimeRemaining])

  // Recalculate on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const newTime = getTimeRemaining()
        setCurrentTimeRemaining(newTime)
        console.log(`ActiveSession ${session.id}: Time recalculated on tab focus:`, newTime)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [getTimeRemaining, session.id])

  // Update time every second, but with periodic recalculation to avoid drift
  useEffect(() => {
    if (currentTimeRemaining <= 0) return

    let tickCount = 0
    const interval = setInterval(() => {
      tickCount++
      
      // Every 10 seconds, recalculate from timestamp to prevent drift
      if (tickCount % 10 === 0) {
        const accurateTime = getTimeRemaining()
        setCurrentTimeRemaining(accurateTime)
      } else {
        // Normal tick
        setCurrentTimeRemaining(prev => Math.max(0, prev - 1))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [currentTimeRemaining, getTimeRemaining])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getSessionTypeLabel = (type: SessionType): string => {
    switch (type) {
      case SessionType.WORK:
        return 'Working'
      case SessionType.SHORT_BREAK:
        return 'Short break'
      case SessionType.LONG_BREAK:
        return 'Long break'
      default:
        return 'Working'
    }
  }

  const getSessionTypeColor = (type: SessionType): string => {
    switch (type) {
      case SessionType.WORK:
        return 'bg-primary-50 border-primary-200 text-primary-700'
      case SessionType.SHORT_BREAK:
        return 'bg-secondary-50 border-secondary-200 text-secondary-700'
      case SessionType.LONG_BREAK:
        return 'bg-blue-50 border-blue-200 text-blue-700'
      default:
        return 'bg-primary-50 border-primary-200 text-primary-700'
    }
  }

  // Если время истекло, не показываем карточку
  if (currentTimeRemaining <= 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`${
        isCurrentUser 
          ? 'bg-white rounded-xl shadow-sm border-2 border-primary-300 p-6 relative' 
          : 'card'
      } hover:shadow-md transition-shadow`}
    >
      {/* Label "You" for current user */}
      {isCurrentUser && (
        <div className="absolute -top-2 -right-2 bg-primary-500 text-white text-xs font-medium px-2 py-1 rounded-full shadow-md">
          You
        </div>
      )}
      
      <div className="space-y-3">
        {/* User Info */}
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isCurrentUser ? 'bg-primary-100' : 'bg-slate-200'
          }`}>
            <User className={`w-5 h-5 ${isCurrentUser ? 'text-primary-600' : 'text-slate-600'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className={`font-semibold ${isCurrentUser ? 'text-primary-800' : 'text-slate-700'}`}>
                {session.username}
                {isCurrentUser && ' (You)'}
              </div>
              {!isCurrentUser && (
                <button
                  onClick={() => router.push(`/user/${session.userId}`)}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                  title="View profile"
                >
                  <ExternalLink className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>
            <div className={`text-xs px-2 py-1 rounded-full border ${getSessionTypeColor(session.type)}`}>
              {getSessionTypeLabel(session.type)}
            </div>
          </div>
        </div>

        {/* Task */}
        <div className={`rounded-lg p-3 ${
          isCurrentUser ? 'bg-primary-50' : 'bg-slate-50'
        }`}>
          <div className="text-sm text-slate-600 mb-1">Task:</div>
          <div className="font-medium text-slate-800 line-clamp-2">
            {session.task}
          </div>
        </div>

        {/* Time Remaining */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">Remaining:</div>
          <div className={`text-xl font-bold ${
            isCurrentUser ? 'text-primary-700' : 'text-primary-600'
          }`}>
            {formatTime(currentTimeRemaining)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-2">
          <motion.div
            className={`h-2 rounded-full transition-all duration-1000 ${
              session.type === SessionType.WORK
                ? 'bg-primary-500'
                : session.type === SessionType.SHORT_BREAK
                ? 'bg-secondary-500'
                : 'bg-blue-500'
            }`}
            initial={{ width: 0 }}
            animate={{
              width: `${Math.max(0, (currentTimeRemaining / ((session.duration || 25) * 60)) * 100)}%`
            }}
          />
        </div>

        {/* Started Time */}
        <div className="text-xs text-slate-500 text-center">
          Started at {new Date(session.startedAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </motion.div>
  )
}

export default function ActiveSessions() {
  const { activeSessions } = useTimerStore()
  const { user } = useAuthStore()
  const [localSessions, setLocalSessions] = useState<ActiveSession[]>([])
  const [hasSocketActivity, setHasSocketActivity] = useState(false)

  useEffect(() => {
    if (activeSessions.length > 0) {
      setHasSocketActivity(true)
      setLocalSessions([])
    }
  }, [activeSessions.length])

  // Load active sessions on mount for guests
  useEffect(() => {
    let interval: NodeJS.Timeout
    let isMounted = true

    const fetchActiveSessions = async () => {
      try {
        const response = await fetch('/api/sessions/active', {
          cache: 'no-store'
        })
        if (response.ok && isMounted) {
          const sessions = await response.json()
          setLocalSessions(sessions)
        }
      } catch (error) {
        console.error('Failed to fetch active sessions:', error)
      }
    }

    // If no active sessions from WebSocket, load from API
    if (!hasSocketActivity && activeSessions.length === 0) {
      fetchActiveSessions()
      // Update every 30 seconds for guests
      interval = setInterval(() => {
        if (isMounted && !hasSocketActivity) {
          fetchActiveSessions()
        }
      }, 30000)
    }

    return () => {
      isMounted = false
      if (interval) clearInterval(interval)
    }
  }, [activeSessions.length, hasSocketActivity])

  // Use sessions from WebSocket if available, otherwise from API
  const sessionsToShow = activeSessions.length > 0 ? activeSessions : localSessions

  // Filter out expired sessions
  const allActiveSessions = sessionsToShow.filter(session => {
    const startTime = new Date(session.startedAt).getTime()
    const now = Date.now()
    const elapsed = Math.floor((now - startTime) / 1000)
    const totalDuration = (session.duration || 25) * 60
    const timeRemaining = totalDuration - elapsed
    return timeRemaining > 0
  })

  if (allActiveSessions.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">
            No one is working yet
          </h3>
          <p className="text-slate-500">
            Be the first to start a pomodoro timer!
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-700 flex items-center">
        <Clock className="w-5 h-5 mr-2" />
        Currently working ({allActiveSessions.length})
      </h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allActiveSessions.map((session, index) => (
          <SessionCard 
            key={session.id} 
            session={session} 
            index={index} 
            isCurrentUser={session.userId === user?.id}
          />
        ))}
      </div>
    </div>
  )
}
