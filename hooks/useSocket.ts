'use client'

import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/useAuthStore'
import { useTimerStore } from '@/store/useTimerStore'
import type { ActiveSession, ChatMessage, User } from '@/types'
import { useConnectionStore } from '@/store/useConnectionStore'
import { getOrCreateAnonymousId, getAnonymousUsername } from '@/lib/anonymousUser'

// Singleton socket to avoid multiple connections per tab
let sharedSocket: Socket | null = null
let initialized = false
let authSubscribed = false

const getSocketUrl = () => process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'

const buildPresencePayload = (user: User | null): { userId: string | null; anonymousId?: string | null; username?: string; avatarUrl?: string | null } => {
  if (user?.id) {
    return { userId: user.id, username: user.username ?? undefined, avatarUrl: user.avatarUrl ?? null, anonymousId: null }
  }
  const anonymousId = getOrCreateAnonymousId()
  return { userId: null, anonymousId, username: getAnonymousUsername(), avatarUrl: null }
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
    reconnectionAttempts: 5,
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

  socket.on('connect', () => {
    // Request initial data
    socket.emit('get-active-sessions')
    socket.emit('get-online-users')

    // Presence identify
    const user = useAuthStore.getState().user
    socket.emit('join-presence', buildPresencePayload(user))

    setConnectionStatus(true)
  })

  socket.on('reconnect', () => {
    // On reconnect, also update presence
    const user = useAuthStore.getState().user
    socket.emit('join-presence', buildPresencePayload(user))
    socket.emit('get-online-users')
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
    setConnectionStatus(false)
    setIsChecking(false)
  })

  socket.on('disconnect', () => {
    setConnectionStatus(false)
    resetPresence()
    setIsChecking(false)
  })

  // Note: React hook below will re-emit presence on user changes
}

export function useSocket() {
  // Ensure singleton is initialized
  useEffect(() => {
    if (typeof window === 'undefined') return
    initSocketOnce()
  }, [])

  // Re-emit presence on user changes via hook
  const { user } = useAuthStore()
  useEffect(() => {
    if (!sharedSocket || !sharedSocket.connected) return
    sharedSocket.emit('join-presence', buildPresencePayload(user))
  }, [user])

  const emitSessionStart = (sessionData: any) => {
    sharedSocket?.emit('session-start', sessionData)
  }

  const emitSessionSync = (sessionData: any) => {
    sharedSocket?.emit('session-sync', sessionData)
  }

  const emitSessionPause = (sessionId: string) => {
    sharedSocket?.emit('session-pause', sessionId)
  }

  const emitSessionEnd = (sessionId: string, reason: 'manual' | 'completed' | 'reset' = 'manual') => {
    sharedSocket?.emit('session-end', { sessionId, reason })
  }

  const emitTimerTick = (sessionId: string, timeRemaining: number) => {
    sharedSocket?.emit('timer-tick', { sessionId, timeRemaining })
  }

  // Chat API
  const sendChatMessage = (text: string) => {
    sharedSocket?.emit('chat-send', { text })
  }

  const requestChatHistory = () => {
    sharedSocket?.emit('chat-history')
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

  const emitChatTyping = (isTyping: boolean) => {
    sharedSocket?.emit('chat-typing', { isTyping })
  }

  const onChatTyping = (handler: (payload: { username: string; isTyping: boolean }) => void) => {
    sharedSocket?.on('chat-typing', handler)
  }

  const offChatTyping = (handler: (payload: { username: string; isTyping: boolean }) => void) => {
    sharedSocket?.off('chat-typing', handler)
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
    emitChatTyping,
    onChatTyping,
    offChatTyping
  }
}
