'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/useAuthStore'
import { useTimerStore } from '@/store/useTimerStore'
import { ActiveSession } from '@/types'

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const { user } = useAuthStore()
  const { setActiveSessions } = useTimerStore()

  useEffect(() => {
    if (typeof window === 'undefined') return

    let reconnectTimer: NodeJS.Timeout

    // Connect to WebSocket server
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'

    socketRef.current = io(socketUrl, {
      path: '/socket',
      transports: ['websocket', 'polling'],
      timeout: 5000,
      autoConnect: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
      withCredentials: true
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      console.log('Connected to WebSocket server')
      
      // Clear any pending reconnect timers
      if (reconnectTimer) clearTimeout(reconnectTimer)
      
      // Always request active sessions, regardless of authentication
      socket.emit('get-active-sessions')
      
      // Join user room if authenticated
      if (user) {
        socket.emit('join-user', user.id)
      }
    })

    socket.on('session-update', (sessions: ActiveSession[]) => {
      console.log('Received session update:', sessions.length, 'sessions')
      setActiveSessions(sessions)
    })

    socket.on('user-online', (data: { userId: string, online: boolean }) => {
      console.log('User online status:', data)
      // You can add online status tracking here if needed
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      
      // Prevent too frequent reconnection attempts
      reconnectTimer = setTimeout(() => {
        if (socket.disconnected) {
          socket.connect()
        }
      }, 5000)
    })

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason)
    })

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (socket) {
        socket.disconnect()
      }
    }
  }, [setActiveSessions]) // Remove user dependency to prevent reconnects

  // Отдельный эффект для подключения пользователя
  useEffect(() => {
    if (socketRef.current && user) {
      socketRef.current.emit('join-user', user.id)
    }
  }, [user])

  const emitSessionStart = (sessionData: any) => {
    if (socketRef.current) {
      socketRef.current.emit('session-start', sessionData)
    }
  }

  const emitSessionPause = (sessionId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('session-pause', sessionId)
    }
  }

  const emitSessionEnd = (sessionId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('session-end', sessionId)
    }
  }

  const emitTimerTick = (sessionId: string, timeRemaining: number) => {
    if (socketRef.current) {
      socketRef.current.emit('timer-tick', { sessionId, timeRemaining })
    }
  }

  return {
    emitSessionStart,
    emitSessionPause,
    emitSessionEnd,
    emitTimerTick
  }
}
