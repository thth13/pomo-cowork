'use client'

import { useCallback, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/useAuthStore'
import { useTimerStore } from '@/store/useTimerStore'
import { SessionStatus, type ActiveSession, type ChatMessage, type User } from '@/types'
import { useConnectionStore } from '@/store/useConnectionStore'
import { getOrCreateAnonymousId, getAnonymousUsername } from '@/lib/anonymousUser'

// Singleton socket to avoid multiple connections per tab
let sharedSocket: Socket | null = null
let initialized = false

type SessionEnd = {
  sessionId: string
  reason: 'manual' | 'completed' | 'reset'
  removeActivity?: boolean
  session?: ActiveSession
}
type SessionEvent = {
  name: 'session-start' | 'session-end'
  ownerId: string
  payload: (ActiveSession & { activityOnly: true }) | SessionEnd
}
// Keep lifecycle events until acknowledged; snapshots themselves are replaceable.
const pendingSessionEvents: SessionEvent[] = []
const sessionSnapshots = new Map<string, ActiveSession>()
const inFlightSessionEvents = new Set<SessionEvent>()

const currentOwnerId = () => useAuthStore.getState().user?.id ?? getOrCreateAnonymousId()

const flushSessionEvents = () => {
  if (!sharedSocket?.connected) return
  const ownerId = currentOwnerId()
  for (const event of pendingSessionEvents) {
    if (event.ownerId !== ownerId || inFlightSessionEvents.has(event)) continue
    inFlightSessionEvents.add(event)
    sharedSocket.timeout(10000).emit(event.name, event.payload, (error: Error | null, accepted?: boolean) => {
      inFlightSessionEvents.delete(event)
      if (!error && accepted) {
        const index = pendingSessionEvents.indexOf(event)
        if (index !== -1) pendingSessionEvents.splice(index, 1)
        if (event.name === 'session-end') {
          sessionSnapshots.delete((event.payload as SessionEnd).sessionId)
        }
      } else {
        window.setTimeout(flushSessionEvents, 2000)
      }
    })
  }
}

const getSocketUrl = () => process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'

const buildPresencePayload = (user: User | null): { userId: string | null; anonymousId?: string | null; username?: string; avatarUrl?: string | null } => {
  if (user?.id) {
    return { userId: user.id, username: user.username ?? undefined, avatarUrl: user.avatarUrl ?? null, anonymousId: null }
  }
  const anonymousId = getOrCreateAnonymousId()
  return { userId: null, anonymousId, username: getAnonymousUsername(), avatarUrl: null }
}

// Every session snapshot carries the latest public profile data.
const withSessionProfile = (session: ActiveSession): ActiveSession => {
  const user = useAuthStore.getState().user
  return {
    ...session,
    userId: session.userId,
    username: user?.username ?? getAnonymousUsername(),
    avatarUrl: user?.avatarUrl,
    experience: user?.experience ?? 0,
  }
}

const syncCurrentSession = () => {
  if (!sharedSocket?.connected) return
  const { currentSession, timeRemaining, isRunning } = useTimerStore.getState()
  if (!currentSession || timeRemaining <= 0 || currentSession.id.startsWith('temp_')) return
  if (currentSession.userId !== currentOwnerId()) return
  if (currentSession.status !== SessionStatus.ACTIVE && currentSession.status !== SessionStatus.PAUSED) return

  const remaining = isRunning
    ? Math.max(0, currentSession.duration * 60 - Math.floor((Date.now() - new Date(currentSession.startedAt).getTime()) / 1000))
    : timeRemaining
  if (remaining <= 0) return

  const snapshot = withSessionProfile({
    ...currentSession,
    username: '',
    timeRemaining: remaining,
    status: isRunning ? SessionStatus.ACTIVE : SessionStatus.PAUSED,
  })
  sessionSnapshots.set(snapshot.id, snapshot)
  sharedSocket.emit('session-sync', snapshot)
}

const initSocketOnce = () => {
  if (initialized) return
  initialized = true

  sharedSocket = io(getSocketUrl(), {
    path: '/socket',
    transports: ['websocket', 'polling'],
    timeout: 5000,
    autoConnect: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    withCredentials: true
  })

  const socket = sharedSocket
  if (!socket) return

  // Stores (non-hook access)
  const setActiveSessions = useTimerStore.getState().setActiveSessions
  const setConnectionStatus = useConnectionStore.getState().setConnectionStatus
  const setIsChecking = useConnectionStore.getState().setIsChecking
  const setOnlineUsersFromList = useConnectionStore.getState().setOnlineUsersFromList
  const updateUserPresence = useConnectionStore.getState().updateUserPresence
  const resetPresence = useConnectionStore.getState().resetPresence
  const setPresenceCounts = useConnectionStore.getState().setPresenceCounts

  // Socket.IO fires connect on both initial connection and every reconnect.
  socket.on('connect', () => {
    socket.emit('join-presence', buildPresencePayload(useAuthStore.getState().user))
    flushSessionEvents()
    syncCurrentSession()
    socket.emit('get-active-sessions')
    socket.emit('get-online-users')
    setConnectionStatus(true)
  })

  // Subscribe once, regardless of how many components use this hook.
  useAuthStore.subscribe((state, previous) => {
    if (state.user === previous.user) return
    const timer = useTimerStore.getState()
    if (timer.currentSession && timer.currentSession.userId !== currentOwnerId()) {
      sessionSnapshots.delete(timer.currentSession.id)
      timer.cancelSession()
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.controller?.postMessage({ type: 'STOP_TIMER' })
      }
    }
    if (!socket.connected) return
    socket.emit('join-presence', buildPresencePayload(state.user))
    flushSessionEvents()
    syncCurrentSession()
  })

  socket.on('session-sync-request', (sessionId: string) => {
    if (useTimerStore.getState().currentSession?.id === sessionId) syncCurrentSession()
  })

  socket.on('session-update', (sessions: ActiveSession[]) => {
    setActiveSessions(sessions)
  })

  socket.on('user-online', (data: { userId: string, online: boolean }) => {
    updateUserPresence(data.userId, data.online)
  })

  socket.on('online-users', (payload: { userIds?: string[]; userCount?: number; anonymousCount?: number; total?: number }) => {
    if (payload.userIds) setOnlineUsersFromList(payload.userIds)
    setPresenceCounts({
      userCount: payload.userCount,
      anonymousCount: payload.anonymousCount,
      total: payload.total
    })
  })

  socket.on('connect_error', () => {
    setActiveSessions([])
    resetPresence()
    setConnectionStatus(false)
    setIsChecking(false)
  })

  socket.on('disconnect', () => {
    setActiveSessions([])
    setConnectionStatus(false)
    resetPresence()
    setIsChecking(false)
  })
}

export function useSocket() {
  // Ensure singleton is initialized
  useEffect(() => {
    if (typeof window === 'undefined') return
    initSocketOnce()
  }, [])

  const emitSessionStart = (sessionData: ActiveSession) => {
    if (sessionData.userId !== currentOwnerId()) return
    const snapshot = withSessionProfile(sessionData)
    sessionSnapshots.set(snapshot.id, snapshot)
    pendingSessionEvents.push({
      name: 'session-start', ownerId: snapshot.userId,
      payload: { ...snapshot, activityOnly: true },
    })
    flushSessionEvents()
    syncCurrentSession()
  }

  const emitSessionSync = useCallback((sessionData: ActiveSession) => {
    if (sessionData.userId !== currentOwnerId()) return
    const snapshot = withSessionProfile(sessionData)
    sessionSnapshots.set(snapshot.id, snapshot)
    if (sharedSocket?.connected) sharedSocket.emit('session-sync', snapshot)
  }, [])

  const emitSessionPause = (sessionId: string) => {
    if (sharedSocket?.connected) sharedSocket.emit('session-pause', sessionId)
  }

  const emitSessionEnd = (
    sessionId: string,
    reason: 'manual' | 'completed' | 'reset' = 'manual',
    options?: { removeActivity?: boolean }
  ) => {
    const session = sessionSnapshots.get(sessionId)
    if (!session || session.userId !== currentOwnerId()) return
    pendingSessionEvents.push({
      name: 'session-end', ownerId: session.userId,
      payload: { sessionId, reason, session, ...options },
    })
    flushSessionEvents()
  }

  const emitTimerTick = (sessionId: string, timeRemaining: number) => {
    if (sharedSocket?.connected) sharedSocket.emit('timer-tick', { sessionId, timeRemaining })
  }

  // Chat API
  const sendChatMessage = (payload: { text: string; username?: string; avatarUrl?: string | null; userId?: string | null; roomId?: string | null }) => {
    sharedSocket?.emit('chat-send', payload)
  }

  const requestChatHistory = (payload?: { roomId?: string | null }) => {
    sharedSocket?.emit('chat-history', payload)
  }

  const onChatMessage = (handler: (message: ChatMessage) => void) => {
    sharedSocket?.on('chat-new', handler)
  }

  const offChatMessage = (handler: (message: ChatMessage) => void) => {
    sharedSocket?.off('chat-new', handler)
  }

  const onChatHistory = (handler: (messages: ChatMessage[]) => void) => {
    sharedSocket?.on('chat-history', handler)
  }

  const offChatHistory = (handler: (messages: ChatMessage[]) => void) => {
    sharedSocket?.off('chat-history', handler)
  }

  const onChatRemove = (handler: (messageId: string) => void) => {
    sharedSocket?.on('chat-remove', handler)
  }

  const offChatRemove = (handler: (messageId: string) => void) => {
    sharedSocket?.off('chat-remove', handler)
  }

  const emitChatTyping = (isTyping: boolean, meta?: { username?: string; avatarUrl?: string | null; userId?: string | null; roomId?: string | null }) => {
    sharedSocket?.emit('chat-typing', { isTyping, ...meta })
  }

  const onChatTyping = (handler: (payload: { username: string; isTyping: boolean }) => void) => {
    sharedSocket?.on('chat-typing', handler)
  }

  const offChatTyping = (handler: (payload: { username: string; isTyping: boolean }) => void) => {
    sharedSocket?.off('chat-typing', handler)
  }

  // Tomato throw
  const emitTomatoThrow = (payload: { fromUserId: string; toUserId: string; fromUsername: string; x?: number; y?: number }) => {
    sharedSocket?.emit('tomato-throw', payload)
  }

  const onTomatoReceive = (handler: (payload: { id: string; fromUserId: string; toUserId: string; fromUsername: string; timestamp: number; x?: number; y?: number }) => void) => {
    sharedSocket?.on('tomato-receive', handler)
  }

  const offTomatoReceive = (handler: (payload: { id: string; fromUserId: string; toUserId: string; fromUsername: string; timestamp: number; x?: number; y?: number }) => void) => {
    sharedSocket?.off('tomato-receive', handler)
  }

  // Reactions
  const emitReactionSet = (payload: { fromUserId: string; toUserId: string; emoji: string }) => {
    sharedSocket?.emit('reaction-set', payload)
  }

  const emitReactionRemove = (payload: { fromUserId: string; toUserId: string }) => {
    sharedSocket?.emit('reaction-remove', payload)
  }

  const requestReactions = useCallback((payload?: { userId?: string | null }) => {
    sharedSocket?.emit('get-reactions', payload)
  }, [])

  const onReactionUpdate = (handler: (payload: { action: 'set' | 'remove'; toUserId: string; fromUserId: string; emoji: string | null; previousEmoji?: string | null; counts: Record<string, number> }) => void) => {
    sharedSocket?.on('reaction-update', handler)
  }

  const offReactionUpdate = (handler: (payload: { action: 'set' | 'remove'; toUserId: string; fromUserId: string; emoji: string | null; previousEmoji?: string | null; counts: Record<string, number> }) => void) => {
    sharedSocket?.off('reaction-update', handler)
  }

  const onReactionSnapshot = (handler: (payload: { countsByTarget: Record<string, Record<string, number>>; myReactionsByTarget?: Record<string, string> }) => void) => {
    sharedSocket?.on('reaction-snapshot', handler)
  }

  const offReactionSnapshot = (handler: (payload: { countsByTarget: Record<string, Record<string, number>>; myReactionsByTarget?: Record<string, string> }) => void) => {
    sharedSocket?.off('reaction-snapshot', handler)
  }

  return {
    emitSessionStart,
    emitSessionSync,
    emitSessionPause,
    emitSessionEnd,
    emitTimerTick,
    // chat
    sendChatMessage,
    requestChatHistory,
    onChatMessage,
    offChatMessage,
    onChatHistory,
    offChatHistory,
    onChatRemove,
    offChatRemove,
    emitChatTyping,
    onChatTyping,
    offChatTyping,
    // tomato
    emitTomatoThrow,
    onTomatoReceive,
    offTomatoReceive,
    // reactions
    emitReactionSet,
    emitReactionRemove,
    requestReactions,
    onReactionUpdate,
    offReactionUpdate,
    onReactionSnapshot,
    offReactionSnapshot
  }
}
