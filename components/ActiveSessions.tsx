'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, User, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TIME_TRACKER_DURATION_MINUTES, useTimerStore } from '@/store/useTimerStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useRoomStore } from '@/store/useRoomStore'
import { SessionType, SessionStatus, ActiveSession, TomatoThrow as TomatoThrowType } from '@/types'
import Image from 'next/image'
import TomatoThrow from './TomatoThrow'
import { useSocket } from '@/hooks/useSocket'
import EmojiPicker from 'emoji-picker-react'

interface TomatoAnimation {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  fromUserId: string
  toUserId: string
}

interface ContextMenuState {
  show: boolean
  x: number
  y: number
  targetUserId: string
  targetElement: HTMLElement | null
}

// Component for individual session with time updates
function SessionCard({ 
  session, 
  index, 
  isCurrentUser = false,
  onContextMenu,
  onElementMount,
  reactions
}: { 
  session: ActiveSession; 
  index: number; 
  isCurrentUser?: boolean;
  onContextMenu: (e: React.MouseEvent, userId: string, element: HTMLElement) => void;
  onElementMount: (userId: string, element: HTMLElement | null) => void;
  reactions?: Record<string, number>;
}) {
  const router = useRouter()
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (cardRef.current) {
      onElementMount(session.userId, cardRef.current)
    }
    return () => {
      onElementMount(session.userId, null)
    }
  }, [session.userId, onElementMount])
  
  const sessionStatus = session.status ?? SessionStatus.ACTIVE
  const isTimeTracking = session.type === SessionType.TIME_TRACKING

  const statusDotClass = sessionStatus === SessionStatus.PAUSED ? 'bg-amber-400' : 'bg-green-400'

  const fallbackDurationSeconds = (isTimeTracking ? TIME_TRACKER_DURATION_MINUTES : session.duration || 25) * 60
  const storedRemainingSeconds = typeof session.timeRemaining === 'number'
    ? session.timeRemaining
    : fallbackDurationSeconds

  const getTimeRemaining = useCallback(() => {
    if (sessionStatus === SessionStatus.PAUSED) {
      return Math.max(0, storedRemainingSeconds)
    }

    const startTime = session.startedAt ? new Date(session.startedAt).getTime() : Number.NaN
    if (Number.isNaN(startTime)) {
      return Math.max(0, storedRemainingSeconds)
    }

    const now = Date.now()
    const elapsed = Math.floor((now - startTime) / 1000) // seconds
    const totalDuration = fallbackDurationSeconds
    return Math.max(0, totalDuration - elapsed)
  }, [sessionStatus, storedRemainingSeconds, session.startedAt, fallbackDurationSeconds])

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
    if (sessionStatus === SessionStatus.PAUSED || currentTimeRemaining <= 0) return

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
  }, [currentTimeRemaining, getTimeRemaining, sessionStatus])

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
      case SessionType.TIME_TRACKING:
        return 'Time tracking'
      default:
        return 'Working'
    }
  }

  const getSessionTypeColor = (type: SessionType): string => {
    switch (type) {
      case SessionType.WORK:
        return 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800/50 text-primary-700 dark:text-primary-400'
      case SessionType.SHORT_BREAK:
        return 'bg-secondary-50 dark:bg-secondary-900/20 border-secondary-200 dark:border-secondary-800/50 text-secondary-700 dark:text-secondary-400'
      case SessionType.LONG_BREAK:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400'
      case SessionType.TIME_TRACKING:
        return 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-400'
      default:
        return 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800/50 text-primary-700 dark:text-primary-400'
    }
  }

  // If time has run out, don't show the card
  if (currentTimeRemaining <= 0) {
    return null
  }

  const getBadgeColor = (type: SessionType): string => {
    switch (type) {
      case SessionType.WORK:
        return 'bg-red-100 text-red-600'
      case SessionType.SHORT_BREAK:
        return 'bg-green-100 text-green-600'
      case SessionType.LONG_BREAK:
        return 'bg-blue-100 text-blue-600'
      case SessionType.TIME_TRACKING:
        return 'bg-indigo-100 text-indigo-600'
      default:
        return 'bg-red-100 text-red-600'
    }
  }

  const getProgressColor = (type: SessionType): string => {
    switch (type) {
      case SessionType.WORK:
        return 'bg-red-500'
      case SessionType.SHORT_BREAK:
        return 'bg-green-500'
      case SessionType.LONG_BREAK:
        return 'bg-blue-500'
      case SessionType.TIME_TRACKING:
        return 'bg-indigo-500'
      default:
        return 'bg-red-500'
    }
  }

  const totalDurationForProgress = Math.max(1, fallbackDurationSeconds)
  const elapsedSeconds = isTimeTracking
    ? Math.max(0, totalDurationForProgress - currentTimeRemaining)
    : currentTimeRemaining

  const progressPercent = isTimeTracking
    ? Math.max(0, Math.min(100, (elapsedSeconds / totalDurationForProgress) * 100))
    : Math.max(0, Math.min(100, (currentTimeRemaining / totalDurationForProgress) * 100))

  const handleClick = () => {
    router.push(`/user/${session.userId}`)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isCurrentUser) {
      e.preventDefault()
      e.stopPropagation()
      onContextMenu(e, session.userId, e.currentTarget as HTMLElement)
    }
  }

  return (
    <motion.div 
      ref={cardRef}
      className="relative bg-gray-50 dark:bg-slate-700 rounded-xl p-4 sm:p-6 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
    >
      {reactions && Object.keys(reactions).length > 0 && (
        <div className="absolute -top-2 -right-2 flex flex-wrap gap-1 bg-white/90 dark:bg-slate-800/90 border border-gray-200 dark:border-slate-600 rounded-full px-2 py-1 shadow-sm max-w-[180px]">
          {Object.entries(reactions).map(([emoji, count]) => (
            <div key={emoji} className="flex items-center gap-1 text-xs text-gray-700 dark:text-slate-200">
              <span className="text-sm">{emoji}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            {session.avatarUrl ? (
              <Image 
                src={session.avatarUrl} 
                alt={session.username}
                width={48}
                height={48}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-300 dark:bg-slate-500 flex items-center justify-center text-gray-700 dark:text-slate-200 font-semibold text-sm sm:text-base">
                {session.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={`absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 ${statusDotClass} rounded-full border-2 border-white dark:border-slate-700`}></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 sm:mb-2 flex-wrap">
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">{session.username}</h3>
              <span className={`text-xs px-2 py-0.5 sm:py-1 rounded-full font-medium ${getBadgeColor(session.type)} whitespace-nowrap`}>
                {getSessionTypeLabel(session.type)}
              </span>
              {sessionStatus === SessionStatus.PAUSED && (
                <span className="text-xs px-2 py-0.5 sm:py-1 rounded-full font-medium bg-amber-100 text-amber-600">
                  Paused
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 mb-1 truncate">
              Task: {session.task}
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400">
              {session.startedAt
                ? `Started: ${new Date(session.startedAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}`
                : 'Start time unavailable'}
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1">
            {formatTime(elapsedSeconds)}
          </div>
          <div className="w-16 sm:w-24 bg-gray-200 dark:bg-slate-600 rounded-full h-2 mb-1">
            <div 
              className={`h-2 rounded-full progress-bar ${getProgressColor(session.type)}`} 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400">
            {sessionStatus === SessionStatus.PAUSED ? 'paused' : isTimeTracking ? 'elapsed' : 'remaining'}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function ActiveSessions() {
  const { activeSessions } = useTimerStore()
  const { user } = useAuthStore()
  const { currentRoomId } = useRoomStore()
  const { onTomatoReceive, offTomatoReceive } = useSocket()
  const [localSessions, setLocalSessions] = useState<ActiveSession[]>([])
  const [hasSocketActivity, setHasSocketActivity] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false,
    x: 0,
    y: 0,
    targetUserId: '',
    targetElement: null
  })
  const [reactionsByUser, setReactionsByUser] = useState<Record<string, Record<string, number>>>({})
  const [tomatoThrows, setTomatoThrows] = useState<TomatoAnimation[]>([])
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const sessionCardsRef = useRef<Map<string, HTMLElement>>(new Map())

  useEffect(() => {
    if (activeSessions.length > 0) {
      setHasSocketActivity(true)
      setLocalSessions([])
    }
  }, [activeSessions.length])

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, show: false }))
      }
    }

    const handleScroll = () => {
      setContextMenu(prev => ({ ...prev, show: false }))
    }

    if (contextMenu.show) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('scroll', handleScroll, true)
      return () => {
        document.removeEventListener('click', handleClickOutside)
        document.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [contextMenu.show])

  // Listen for incoming tomato throws via WebSocket
  useEffect(() => {
    const handleTomatoReceive = (payload: TomatoThrowType) => {
      // Find the target user's card element
      const targetElement = sessionCardsRef.current.get(payload.toUserId)
      const fromElement = sessionCardsRef.current.get(payload.fromUserId)
      
      if (!targetElement || !fromElement) return

      const targetRect = targetElement.getBoundingClientRect()
      const fromRect = fromElement.getBoundingClientRect()
      
      const startX = fromRect.left + fromRect.width / 2
      const startY = fromRect.top + fromRect.height / 2
      const endX = targetRect.left + targetRect.width / 2
      const endY = targetRect.top + targetRect.height / 2

      setTomatoThrows(prev => [...prev, {
        id: payload.id,
        startX,
        startY,
        endX,
        endY,
        fromUserId: payload.fromUserId,
        toUserId: payload.toUserId
      }])
    }

    onTomatoReceive(handleTomatoReceive)
    
    return () => {
      offTomatoReceive(handleTomatoReceive)
    }
  }, [onTomatoReceive, offTomatoReceive])

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

  const handleContextMenu = (e: React.MouseEvent, targetUserId: string, element: HTMLElement) => {
    e.preventDefault()
    
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      targetUserId,
      targetElement: element
    })
  }

  const handleAddReaction = (emoji: string) => {
    if (!contextMenu.targetUserId) {
      setContextMenu(prev => ({ ...prev, show: false }))
      return
    }

    setReactionsByUser(prev => {
      const current = prev[contextMenu.targetUserId] ?? {}
      const nextCount = (current[emoji] ?? 0) + 1
      return {
        ...prev,
        [contextMenu.targetUserId]: {
          ...current,
          [emoji]: nextCount
        }
      }
    })

    setContextMenu(prev => ({ ...prev, show: false }))
  }

  const handleTomatoAnimationComplete = (id: string) => {
    setTomatoThrows(prev => prev.filter(t => t.id !== id))
  }

  const handleElementMount = useCallback((userId: string, element: HTMLElement | null) => {
    if (element) {
      sessionCardsRef.current.set(userId, element)
    } else {
      sessionCardsRef.current.delete(userId)
    }
  }, [])

  // Use sessions from WebSocket if available, otherwise from API
  const sessionsToShow = activeSessions.length > 0 ? activeSessions : localSessions

  const sessionsInRoom = sessionsToShow.filter((session) => (session.roomId ?? null) === currentRoomId)

  // Filter out expired sessions
  const allActiveSessions = sessionsInRoom.filter(session => {
    const status = session.status ?? SessionStatus.ACTIVE

    if (status === SessionStatus.PAUSED) {
      const remaining = typeof session.timeRemaining === 'number'
        ? session.timeRemaining
        : (session.duration || 25) * 60
      return remaining > 0
    }

    const fallbackSeconds = (session.duration || 25) * 60
    const storedRemaining = typeof session.timeRemaining === 'number' ? session.timeRemaining : fallbackSeconds

    if (!session.startedAt) {
      return storedRemaining > 0
    }

    const startTime = new Date(session.startedAt).getTime()
    if (Number.isNaN(startTime)) {
      return storedRemaining > 0
    }

    const now = Date.now()
    const elapsed = Math.floor((now - startTime) / 1000)
    const totalDuration = fallbackSeconds
    const timeRemaining = totalDuration - elapsed
    return timeRemaining > 0
  })

  if (allActiveSessions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 lg:p-8">
        <div className="text-center py-8">
          <User className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-slate-300 mb-2">
            No active sessions
          </h3>
          <p className="text-gray-500 dark:text-slate-400">
            Start the timer to see your activity here!
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <>
      <TomatoThrow 
        tomatoThrows={tomatoThrows}
        onAnimationComplete={handleTomatoAnimationComplete}
        currentUserId={user?.id}
      />
      
      {contextMenu.show && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-2 min-w-[200px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`
          }}
        >
          <EmojiPicker
            onEmojiClick={(emojiData) => handleAddReaction(emojiData.emoji)}
            width={260}
            height={320}
            lazyLoadEmojis
            searchDisabled
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}
      
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Currently Working</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-300">
          <div className="w-2 h-2 bg-green-400 rounded-full pulse-dot"></div>
          <span>{allActiveSessions.length} online</span>
        </div>
      </div>
      
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {allActiveSessions.map((session, index) => (
            <SessionCard 
              key={session.id} 
              session={session} 
              index={index} 
              isCurrentUser={session.userId === user?.id}
              onContextMenu={handleContextMenu}
              onElementMount={handleElementMount}
              reactions={reactionsByUser[session.userId]}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
    </>
  )
}
