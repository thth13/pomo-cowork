'use client'

import { useCallback, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/useAuthStore'
import { useTimerStore } from '@/store/useTimerStore'
import { SessionStatus, type ActiveSession, type ChatHistoryRequest, type ChatHistoryResponse, type ChatMessage, type RoomAccessSnapshot, type User } from '@/types'
import { useConnectionStore } from '@/store/useConnectionStore'
import { useRoomStore } from '@/store/useRoomStore'
import { getOrCreateAnonymousId, getAnonymousUsername } from '@/lib/anonymousUser'

// Singleton socket to avoid multiple connections per tab
let sharedSocket: Socket | null = null
let initialized = false
let roomAccessVersion = 0
let roomAccessTimeout: ReturnType<typeof setTimeout> | null = null

const clearRoomAccessTimeout = () => {
  if (roomAccessTimeout) clearTimeout(roomAccessTimeout)
  roomAccessTimeout = null
}
const watchRoomAccess = () => {
  if (roomAccessTimeout) return
  const version = roomAccessVersion
  roomAccessTimeout = setTimeout(() => {
    roomAccessTimeout = null
    if (version === roomAccessVersion && useConnectionStore.getState().roomAccess?.status !== 'ready') {
      useConnectionStore.getState().setRoomAccess({ version, status: 'error', roomIds: [] })
    }
  }, 12000)
}
const resetRoomAccess = () => {
  roomAccessVersion += 1
  clearRoomAccessTimeout()
  useConnectionStore.getState().setRoomAccess(null)
  useTimerStore.getState().setActiveSessions([])
  watchRoomAccess()
}

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

const buildPresencePayload = (user: User | null): { userId: string | null; anonymousId?: string | null; username?: string; avatarUrl?: string | null; token?: string } => {
  if (user?.id) {
    return { userId: user.id, username: user.username ?? undefined, avatarUrl: user.avatarUrl ?? null, anonymousId: null, token: useAuthStore.getState().token ?? undefined }
  }
  const anonymousId = getOrCreateAnonymousId()
  return { userId: null, anonymousId, username: getAnonymousUsername(), avatarUrl: null }
}

// Every session snapshot carries the latest public profile data.
const withSessionProfile = (session: ActiveSession): ActiveSession => {
  const user = useAuthStore.getState().user
  const current = useTimerStore.getState().currentSession
  return {
    ...session,
    presenceToken: session.presenceToken ?? (current?.id === session.id ? current.presenceToken : undefined) ?? sessionSnapshots.get(session.id)?.presenceToken,
    userId: session.userId,
    username: user?.username ?? getAnonymousUsername(),
    avatarUrl: user?.avatarUrl,
    experience: user?.experience ?? 0,
    isPro: Boolean(user?.isPro && (!user.proExpiresAt || new Date(user.proExpiresAt) > new Date())),
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
  sharedSocket.emit('session-sync', { ...snapshot, token: useAuthStore.getState().token ?? undefined })
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
    resetRoomAccess()
    socket.emit('join-presence', { ...buildPresencePayload(useAuthStore.getState().user), accessVersion: roomAccessVersion })
    flushSessionEvents()
    syncCurrentSession()
    socket.emit('get-active-sessions')
    socket.emit('get-online-users')
    setConnectionStatus(true)
  })

  // Subscribe once, regardless of how many components use this hook.
  useAuthStore.subscribe((state, previous) => {
    if (state.user === previous.user && state.token === previous.token) return
    if (state.user?.id !== previous.user?.id || state.token !== previous.token) resetRoomAccess()
    let timer = useTimerStore.getState()
    const convertedId = state.convertedAnonymousId
    if (state.user && convertedId && convertedId !== state.user.id) {
      const registeredId = state.user.id
      sessionSnapshots.forEach((snapshot) => {
        if (snapshot.userId === convertedId) snapshot.userId = registeredId
      })
      for (const event of pendingSessionEvents) {
        if (event.ownerId !== convertedId) continue
        event.ownerId = registeredId
        if ('userId' in event.payload) event.payload.userId = registeredId
        else if (event.payload.session) event.payload.session.userId = registeredId
      }
      if (timer.currentSession?.userId === convertedId) {
        useTimerStore.setState({ currentSession: { ...timer.currentSession, userId: registeredId } })
        timer = useTimerStore.getState()
      }
    }
    if (timer.currentSession && timer.currentSession.userId !== currentOwnerId()) {
      sessionSnapshots.delete(timer.currentSession.id)
      timer.cancelSession()
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.controller?.postMessage({ type: 'STOP_TIMER' })
      }
    }
    if (!socket.connected) return
    socket.emit('join-presence', { ...buildPresencePayload(state.user), accessVersion: roomAccessVersion })
    flushSessionEvents()
    syncCurrentSession()
  })

  socket.on('session-sync-request', (sessionId: string) => {
    if (useTimerStore.getState().currentSession?.id === sessionId) syncCurrentSession()
  })

  socket.on('session-update', (sessions: ActiveSession[], access?: RoomAccessSnapshot) => {
    if (!access || access.version !== roomAccessVersion) return
    if (!['loading', 'ready', 'error'].includes(access.status) || !Array.isArray(access.roomIds)) return
    const previousAccess = useConnectionStore.getState().roomAccess
    useConnectionStore.getState().setRoomAccess(access)
    if (access.status === 'loading') watchRoomAccess()
    else clearRoomAccessTimeout()
    setActiveSessions(sessions)
    if (access.status === 'ready' && previousAccess?.status !== 'ready') {
      window.dispatchEvent(new Event('pomo:room-access-restored'))
    }
  })

  // New membership and room privacy changes must not wait for the access cache.
  const refreshSessionAccess = () => {
    if (socket.connected && document.visibilityState === 'visible') {
      socket.emit('get-active-sessions', { refreshAccess: true })
      syncCurrentSession()
    }
  }
  useRoomStore.subscribe((state, previous) => {
    if (state.currentRoomId !== previous.currentRoomId) refreshSessionAccess()
  })
  window.addEventListener('focus', refreshSessionAccess)
  document.addEventListener('visibilitychange', refreshSessionAccess)

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
    clearRoomAccessTimeout()
    useConnectionStore.getState().setRoomAccess(null)
    setActiveSessions([])
    resetPresence()
    setConnectionStatus(false)
    setIsChecking(false)
  })

  socket.on('disconnect', () => {
    clearRoomAccessTimeout()
    useConnectionStore.getState().setRoomAccess(null)
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

  const refreshActiveSessions = useCallback(() => {
    if (sharedSocket?.connected) {
      if (useConnectionStore.getState().roomAccess?.status !== 'ready') {
        useConnectionStore.getState().setRoomAccess({ version: roomAccessVersion, status: 'loading', roomIds: [] })
        watchRoomAccess()
      }
      sharedSocket.emit('get-active-sessions', { refreshAccess: true })
    }
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
    if (sharedSocket?.connected) sharedSocket.emit('session-sync', { ...snapshot, token: useAuthStore.getState().token ?? undefined })
  }, [])

  const emitSessionPause = (sessionId: string) => {
    if (sharedSocket?.connected) sharedSocket.emit('session-pause', { sessionId, presenceToken: sessionSnapshots.get(sessionId)?.presenceToken })
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
    if (sharedSocket?.connected) sharedSocket.emit('timer-tick', { sessionId, timeRemaining, presenceToken: sessionSnapshots.get(sessionId)?.presenceToken })
  }

  // Chat API
  const sendChatMessage = (payload: { text: string; messageId: string; username?: string; avatarUrl?: string | null; userId?: string | null; roomId?: string | null }) => {
    const { user, token, isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated || !user || user.isAnonymous || !token) return
    sharedSocket?.emit('chat-send', { ...payload, token })
  }

  const requestChatHistory = (payload: ChatHistoryRequest) => {
    sharedSocket?.emit('chat-history', payload)
  }

  const onChatMessage = (handler: (message: ChatMessage) => void) => {
    sharedSocket?.on('chat-new', handler)
  }

  const offChatMessage = (handler: (message: ChatMessage) => void) => {
    sharedSocket?.off('chat-new', handler)
  }

  const onChatHistory = (handler: (response: ChatHistoryResponse) => void) => {
    sharedSocket?.on('chat-history', handler)
  }

  const offChatHistory = (handler: (response: ChatHistoryResponse) => void) => {
    sharedSocket?.off('chat-history', handler)
  }

  const onChatRemove = (handler: (messageId: string) => void) => {
    sharedSocket?.on('chat-remove', handler)
  }

  const offChatRemove = (handler: (messageId: string) => void) => {
    sharedSocket?.off('chat-remove', handler)
  }

  const emitChatTyping = (isTyping: boolean, meta?: { username?: string; avatarUrl?: string | null; userId?: string | null; roomId?: string | null }) => {
    const { user, token, isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated || !user || user.isAnonymous || !token) return
    sharedSocket?.emit('chat-typing', { isTyping, ...meta, token })
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
    refreshActiveSessions,
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
