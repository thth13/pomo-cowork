import dotenv from 'dotenv'
import express from 'express'
import type { Server } from 'http'
import http from 'http'
import cors from 'cors'
import { Server as IOServer } from 'socket.io'

dotenv.config()

interface PomodoroSession {
  id: string
  userId: string
  username: string
  task: string
  type: string
  timeRemaining: number
  startedAt: string
  duration: number
  status?: 'paused'
  socketId?: string
  lastUpdate?: number
  startTime: number
}

interface ChatMessage {
  id: string
  userId: string | null
  username: string
  text: string
  timestamp: number
  type?: 'message' | 'system'
  action?: {
    type: 'work_start' | 'break_start' | 'long_break_start' | 'timer_stop'
    duration?: number
  }
}

const app = express()
const server: Server = http.createServer(app)

const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) ?? '*' // eslint-disable-line @typescript-eslint/prefer-nullish-coalescing

const io = new IOServer(server, {
  path: '/socket',
  cors: {
    origin: corsOrigin,
    credentials: true
  }
})

const sessions = new Map<string, PomodoroSession>()
const onlineUsers = new Map<string, number>()
const socketUserMap = new Map<string, string>()
const userConnectionCounts = new Map<string, number>()
const anonymousSockets = new Map<string, string>()
const anonymousConnectionCounts = new Map<string, number>()
const userNames = new Map<string, string>()
const chatMessages: ChatMessage[] = []

const MAX_CHAT_HISTORY = 100

const incrementUserConnection = (userId: string) => {
  const next = (userConnectionCounts.get(userId) ?? 0) + 1
  userConnectionCounts.set(userId, next)

  if (next === 1) {
    onlineUsers.set(userId, Date.now())
    io.emit('user-online', { userId, online: true })
  }
}

const decrementUserConnection = (userId: string) => {
  const current = userConnectionCounts.get(userId)
  if (!current) {
    return
  }

  const next = current - 1
  if (next <= 0) {
    userConnectionCounts.delete(userId)
    onlineUsers.delete(userId)
    io.emit('user-online', { userId, online: false })
  } else {
    userConnectionCounts.set(userId, next)
  }
}

const addAnonymousConnection = (anonymousId: string, socketId: string) => {
  const prev = anonymousSockets.get(socketId)
  if (prev === anonymousId) {
    // Idempotent: same mapping already set for this socket
    return
  }

  if (prev && prev !== anonymousId) {
    // Decrement previous mapping
    const prevCount = anonymousConnectionCounts.get(prev) ?? 0
    if (prevCount <= 1) {
      anonymousConnectionCounts.delete(prev)
    } else {
      anonymousConnectionCounts.set(prev, prevCount - 1)
    }
  }

  const next = (anonymousConnectionCounts.get(anonymousId) ?? 0) + 1
  anonymousConnectionCounts.set(anonymousId, next)
  anonymousSockets.set(socketId, anonymousId)
}

const removeAnonymousConnectionBySocket = (socketId: string) => {
  const anonymousId = anonymousSockets.get(socketId)
  if (!anonymousId) {
    return
  }

  anonymousSockets.delete(socketId)

  const current = anonymousConnectionCounts.get(anonymousId)
  if (!current) {
    return
  }

  const next = current - 1
  if (next <= 0) {
    anonymousConnectionCounts.delete(anonymousId)
  } else {
    anonymousConnectionCounts.set(anonymousId, next)
  }
}

const serializeSessions = () =>
  Array.from(sessions.values()).map((session) => ({
    id: session.id,
    userId: session.userId,
    username: session.username,
    task: session.task,
    type: session.type,
    duration: session.duration,
    timeRemaining: session.timeRemaining,
    startedAt: session.startedAt,
    status: session.status
  }))

setInterval(() => {
  let cleaned = 0
  sessions.forEach((session, sessionId) => {
    const elapsed = (Date.now() - session.startTime) / 1000
    if (elapsed > session.duration * 60 + 300) {
      sessions.delete(sessionId)
      cleaned += 1
    }
  })

  if (cleaned > 0) {
    io.emit('session-update', serializeSessions())
  }
}, 60000)

const emitPresenceSnapshot = () => {
  // Count unique anonymous users (by anonymousId), not connections
  const anonymousCount = anonymousConnectionCounts.size
  io.emit('online-users', {
    userIds: Array.from(onlineUsers.keys()),
    userCount: onlineUsers.size,
    anonymousCount,
    total: onlineUsers.size + anonymousCount
  })
}

io.on('connection', (socket) => {
  emitPresenceSnapshot()

  socket.on('join-presence', (payload?: { userId: string | null; anonymousId?: string | null; username?: string | null }) => {
    const userId = payload?.userId ?? null
    const anonymousId = payload?.anonymousId ?? null
    const username = payload?.username ?? null

    if (userId) {
      socket.join(`user-${userId}`)
      socketUserMap.set(socket.id, userId)
      if (username) {
        userNames.set(userId, username)
      }
      incrementUserConnection(userId)
    }

    if (anonymousId) {
      addAnonymousConnection(anonymousId, socket.id)
    } else {
      removeAnonymousConnectionBySocket(socket.id)
    }

    emitPresenceSnapshot()
  })

  socket.on('chat-send', (payload: { text: string }) => {
    const rawText = (payload?.text ?? '').toString().slice(0, 1000)
    if (!rawText.trim()) return

    const userId = socketUserMap.get(socket.id) ?? null
    const anonymousId = anonymousSockets.get(socket.id)

    let username = 'Guest'
    if (userId) {
      username = userNames.get(userId) ?? `User-${userId.slice(0, 6)}`
    } else if (anonymousId) {
      username = `Guest-${anonymousId.slice(-4)}`
    }

    const localMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      username,
      text: rawText,
      timestamp: Date.now()
    }

    // Store locally and broadcast
    chatMessages.push(localMessage)
    if (chatMessages.length > MAX_CHAT_HISTORY) {
      chatMessages.splice(0, chatMessages.length - MAX_CHAT_HISTORY)
    }
    
    // Broadcast to all other clients (not sender)
    socket.broadcast.emit('chat-new', localMessage)
  })

  socket.on('chat-typing', (payload: { isTyping: boolean }) => {
    const userId = socketUserMap.get(socket.id) ?? null
    const anonymousId = anonymousSockets.get(socket.id)
    let username = 'Guest'
    if (userId) {
      username = userNames.get(userId) ?? `User-${userId.slice(0, 6)}`
    } else if (anonymousId) {
      username = `Guest-${anonymousId.slice(-4)}`
    }
    socket.broadcast.emit('chat-typing', {
      username,
      isTyping: Boolean(payload?.isTyping)
    })
  })

  socket.on('session-start', (sessionData: PomodoroSession) => {
    sessions.set(sessionData.id, {
      ...sessionData,
      socketId: socket.id,
      startTime: Date.now()
    })

    // Send system message about session start
    const userId = socketUserMap.get(socket.id) ?? null
    const anonymousId = anonymousSockets.get(socket.id)
    let username = 'Guest'
    if (userId) {
      username = userNames.get(userId) ?? `User-${userId.slice(0, 6)}`
    } else if (anonymousId) {
      username = `Guest-${anonymousId.slice(-4)}`
    }

    let actionType: 'work_start' | 'break_start' | 'long_break_start'
    switch (sessionData.type) {
      case 'WORK':
        actionType = 'work_start'
        break
      case 'SHORT_BREAK':
        actionType = 'break_start'
        break
      case 'LONG_BREAK':
        actionType = 'long_break_start'
        break
      default:
        actionType = 'work_start'
    }

    const systemMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      username,
      text: '',
      timestamp: Date.now(),
      type: 'system',
      action: {
        type: actionType,
        ...(actionType === 'work_start' && { duration: sessionData.duration })
      }
    }

    // Store locally and broadcast
    chatMessages.push(systemMessage)
    if (chatMessages.length > MAX_CHAT_HISTORY) {
      chatMessages.splice(0, chatMessages.length - MAX_CHAT_HISTORY)
    }
    io.emit('chat-new', systemMessage)

    io.emit('session-update', serializeSessions())
  })

  socket.on('session-sync', (sessionData: PomodoroSession) => {
    // Sync existing session without sending system message
    sessions.set(sessionData.id, {
      ...sessionData,
      socketId: socket.id,
      startTime: Date.now() - (sessionData.duration * 60 * 1000 - sessionData.timeRemaining * 1000)
    })

    io.emit('session-update', serializeSessions())
  })

  socket.on('session-pause', (sessionId: string) => {
    const session = sessions.get(sessionId)
    if (!session) {
      return
    }

    session.status = 'paused'
    io.emit('session-update', serializeSessions())
  })

  socket.on('session-end', (sessionId: string) => {
    const session = sessions.get(sessionId)
    if (session) {
      // Send system message about timer stop
      const userId = socketUserMap.get(socket.id) ?? null
      const anonymousId = anonymousSockets.get(socket.id)
      let username = 'Guest'
      if (userId) {
        username = userNames.get(userId) ?? `User-${userId.slice(0, 6)}`
      } else if (anonymousId) {
        username = `Guest-${anonymousId.slice(-4)}`
      }

      const systemMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId,
        username,
        text: '',
        timestamp: Date.now(),
        type: 'system',
        action: {
          type: 'timer_stop'
        }
      }

      // Store locally and broadcast
      chatMessages.push(systemMessage)
      if (chatMessages.length > MAX_CHAT_HISTORY) {
        chatMessages.splice(0, chatMessages.length - MAX_CHAT_HISTORY)
      }
      io.emit('chat-new', systemMessage)
    }

    sessions.delete(sessionId)
    io.emit('session-update', serializeSessions())
  })

  socket.on('timer-tick', (payload?: { sessionId: string; timeRemaining: number }) => {
    if (!payload?.sessionId) return
    const session = sessions.get(payload.sessionId)
    if (!session) {
      return
    }

    session.timeRemaining = Number(payload.timeRemaining) || 0
    session.lastUpdate = Date.now()

    if (payload.timeRemaining % 30 === 0) {
      io.emit('session-update', serializeSessions())
    }
  })

  socket.on('get-active-sessions', () => {
    socket.emit('session-update', serializeSessions())
  })

  socket.on('get-online-users', () => {
    const anonymousCount = anonymousConnectionCounts.size
    socket.emit('online-users', {
      userIds: Array.from(onlineUsers.keys()),
      userCount: onlineUsers.size,
      anonymousCount,
      total: onlineUsers.size + anonymousCount
    })
  })

  socket.on('disconnect', () => {
    const userId = socketUserMap.get(socket.id)
    if (userId) {
      socketUserMap.delete(socket.id)
      decrementUserConnection(userId)
    }

    sessions.forEach((session) => {
      if (session.socketId === socket.id) {
        decrementUserConnection(session.userId)
      }
    })

    removeAnonymousConnectionBySocket(socket.id)

    emitPresenceSnapshot()
  })
})

app.use(cors({ origin: corsOrigin, credentials: true }))
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const port = Number(process.env.PORT) || 4000

server.listen(port, () => {
  console.log(`Socket server listening on port ${port}`)
})

