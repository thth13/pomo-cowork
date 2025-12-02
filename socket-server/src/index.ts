import dotenv from 'dotenv'
import express from 'express'
import type { Server } from 'http'
import http from 'http'
import cors from 'cors'
import { Server as IOServer } from 'socket.io'
import axios from 'axios'

dotenv.config()

interface PomodoroSession {
  id: string
  userId: string
  username: string
  avatarUrl?: string
  task: string
  type: string
  timeRemaining: number
  startedAt: string
  duration: number
  status?: 'PAUSED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  socketId?: string
  lastUpdate?: number
  startTime: number
  chatMessageId?: string
}

interface ChatMessage {
  id: string
  userId: string | null
  username: string
  avatarUrl?: string
  text: string
  timestamp: number
  type?: 'message' | 'system'
  action?: {
    type: 'work_start' | 'break_start' | 'long_break_start' | 'timer_stop' | 'session_complete'
    duration?: number
    task?: string
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
const userAvatars = new Map<string, string>()
const chatMessages: ChatMessage[] = []

const MAX_CHAT_HISTORY = 100

// URL to Next.js API
const API_URL = process.env.API_URL || 'http://localhost:3000'

// Function to save system messages to database via API
const saveSystemMessageToDB = async (message: ChatMessage) => {
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3000'
    const response = await axios.post(`${apiUrl}/api/chat/messages`, {
      userId: message.userId,
      username: message.username,
      type: 'system',
      action: message.action
    })
    return response.data as { id: string } | null
  } catch (error) {
    console.error('Failed to save system message to database:', error)
    return null
  }
}

const deleteSystemMessageFromDB = async (messageId: string, sessionId?: string) => {
  if (!messageId) return
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3000'
    const url = new URL(`/api/chat/messages/${messageId}`, apiUrl)
    if (sessionId) {
      url.searchParams.set('sessionId', sessionId)
    }
    await axios.delete(url.toString())
  } catch (error) {
    console.error(`Failed to delete system message ${messageId} from database:`, error)
  }
}

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

// Function to load active sessions from DB
const loadActiveSessionsFromDB = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/sessions/active`)
    const dbSessions = response.data as Array<{
      id: string
      userId: string
      username: string
      task: string
      type: string
      duration: number
      timeRemaining: number
      startedAt: string
    }>

    // Update local session cache
    for (const dbSession of dbSessions) {
      // Check if this session already exists in memory
      const existingSession = sessions.get(dbSession.id)
      
      if (!existingSession) {
        // Add new session from DB
        const startTime = new Date(dbSession.startedAt).getTime()
        const now = Date.now()
        const elapsed = Math.floor((now - startTime) / 1000)
        const calculatedStartTime = now - (dbSession.duration * 60 * 1000 - dbSession.timeRemaining * 1000)
        
        sessions.set(dbSession.id, {
          id: dbSession.id,
          userId: dbSession.userId,
          username: dbSession.username,
          task: dbSession.task,
          type: dbSession.type,
          duration: dbSession.duration,
          timeRemaining: dbSession.timeRemaining,
          startedAt: dbSession.startedAt,
          startTime: calculatedStartTime,
          lastUpdate: now
        })
      } else {
        // Update existing session with data from DB
        existingSession.timeRemaining = dbSession.timeRemaining
        existingSession.lastUpdate = Date.now()
      }
    }

    // Remove sessions that are no longer in DB
    const dbSessionIds = new Set(dbSessions.map(s => s.id))
    for (const [sessionId, session] of sessions.entries()) {
      if (!dbSessionIds.has(sessionId)) {
        // Check if session is outdated (more than 5 minutes without update)
        if (session.lastUpdate && Date.now() - session.lastUpdate > 5 * 60 * 1000) {
          sessions.delete(sessionId)
        }
      }
    }

    console.log(`Loaded ${dbSessions.length} active sessions from database`)
    return dbSessions.length
  } catch (error) {
    console.error('Failed to load active sessions from database:', error)
    return 0
  }
}

const serializeSessions = () =>
  Array.from(sessions.values()).map((session) => ({
    id: session.id,
    userId: session.userId,
    username: session.username,
    avatarUrl: session.avatarUrl,
    task: session.task,
    type: session.type,
    duration: session.duration,
    timeRemaining: session.timeRemaining,
    startedAt: session.startedAt,
    status: session.status
  }))

// // Periodic time update for sessions (every 5 seconds)
// setInterval(() => {
//   let updated = false
//   sessions.forEach((session) => {
//     // Calculate actual remaining time based on startTime
//     const elapsed = (Date.now() - session.startTime) / 1000
//     const totalDuration = session.duration * 60
//     const calculatedTimeRemaining = Math.max(0, totalDuration - elapsed)
    
//     // Update only if changed
//     if (Math.abs(session.timeRemaining - calculatedTimeRemaining) > 1) {
//       session.timeRemaining = calculatedTimeRemaining
//       session.lastUpdate = Date.now()
//       updated = true
//     }
//   })
  
//   if (updated) {
//     io.emit('session-update', serializeSessions())
//   }
// }, 5000)


// Periodic DB synchronization (every 30 seconds)
setInterval(async () => {
  await loadActiveSessionsFromDB()
  io.emit('session-update', serializeSessions())
}, 30000)

// Periodic cleanup of outdated sessions (every minute)
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

// Periodic cleanup of "ghost" connections
setInterval(() => {
  // Check if there are active sockets for each user
  const activeSockets = new Set<string>()
  io.sockets.sockets.forEach(socket => {
    const userId = socketUserMap.get(socket.id)
    if (userId) {
      activeSockets.add(userId)
    }
  })

  // Remove users without active sockets
  let cleaned = false
  onlineUsers.forEach((_, userId) => {
    if (!activeSockets.has(userId)) {
      onlineUsers.delete(userId)
      userConnectionCounts.delete(userId)
      cleaned = true
    }
  })

  // Clean anonymous connections
  const activeAnonymousSockets = new Set<string>()
  io.sockets.sockets.forEach(socket => {
    const anonId = anonymousSockets.get(socket.id)
    if (anonId) {
      activeAnonymousSockets.add(anonId)
    }
  })

  anonymousConnectionCounts.forEach((_, anonId) => {
    if (!activeAnonymousSockets.has(anonId)) {
      anonymousConnectionCounts.delete(anonId)
      cleaned = true
    }
  })

  if (cleaned) {
    emitPresenceSnapshot()
  }
}, 30000) // Every 30 seconds

const emitPresenceSnapshot = () => {
  const activeSocketCount = io.sockets.sockets.size

  // Count unique anonymous users (by anonymousId), not connections
  const anonymousCount = anonymousConnectionCounts.size
  io.emit('online-users', {
    userIds: Array.from(onlineUsers.keys()),
    userCount: onlineUsers.size,
    anonymousCount,
    total: activeSocketCount
  })
}

io.on('connection', async (socket) => {
  emitPresenceSnapshot()
  
  // On connection, load actual sessions from DB and send to client
  await loadActiveSessionsFromDB()
  socket.emit('session-update', serializeSessions())

  socket.on('join-presence', (payload?: { userId: string | null; anonymousId?: string | null; username?: string | null; avatarUrl?: string | null }) => {
    const userId = payload?.userId ?? null
    const anonymousId = payload?.anonymousId ?? null
    const username = payload?.username ?? null
    const avatarUrl = payload?.avatarUrl ?? null

    if (userId) {
      socket.join(`user-${userId}`)
      socketUserMap.set(socket.id, userId)
      if (username) {
        userNames.set(userId, username)
      }
      if (avatarUrl) {
        userAvatars.set(userId, avatarUrl)
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

  socket.on('chat-send', (payload: { text: string; userId?: string | null; username?: string; avatarUrl?: string | null }) => {
    const rawText = (payload?.text ?? '').toString().slice(0, 1000)
    if (!rawText.trim()) return

    const userId = socketUserMap.get(socket.id) ?? payload?.userId ?? null
    const anonymousId = anonymousSockets.get(socket.id)

    const payloadUsername = payload?.username?.toString().slice(0, 100) || undefined
    const payloadAvatar = payload?.avatarUrl || undefined

    let username = payloadUsername || 'Guest'
    let avatarUrl: string | undefined = payloadAvatar || undefined

    if (userId) {
      const mappedUsername = userNames.get(userId)
      const mappedAvatar = userAvatars.get(userId)

      username = mappedUsername || payloadUsername || `User-${userId.slice(0, 6)}`
      avatarUrl = mappedAvatar || payloadAvatar || undefined

      // Refresh maps if client sent updated data
      if (payloadUsername) {
        userNames.set(userId, payloadUsername)
      }
      if (payloadAvatar) {
        userAvatars.set(userId, payloadAvatar)
      }
    } else if (anonymousId) {
      username = `Guest-${anonymousId.slice(-4)}`
    }

    const localMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      username,
      avatarUrl,
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

  socket.on('chat-typing', (payload: { isTyping: boolean; userId?: string | null; username?: string; avatarUrl?: string | null }) => {
    const userId = socketUserMap.get(socket.id) ?? payload?.userId ?? null
    const anonymousId = anonymousSockets.get(socket.id)
    const payloadUsername = payload?.username?.toString().slice(0, 100) || undefined
    const payloadAvatar = payload?.avatarUrl || undefined

    let username = payloadUsername || 'Guest'

    if (userId) {
      const mappedUsername = userNames.get(userId)
      username = mappedUsername || payloadUsername || `User-${userId.slice(0, 6)}`

      // Keep cache fresh if client sent data
      if (payloadUsername) {
        userNames.set(userId, payloadUsername)
      }
      if (payloadAvatar) {
        userAvatars.set(userId, payloadAvatar)
      }
    } else if (anonymousId) {
      username = `Guest-${anonymousId.slice(-4)}`
    }
    socket.broadcast.emit('chat-typing', {
      username,
      isTyping: Boolean(payload?.isTyping)
    })
  })

  socket.on('session-start', async (sessionData: PomodoroSession) => {
    // Remove any existing sessions for this user/socket to prevent duplicates
    const userId = sessionData.userId || (socketUserMap.get(socket.id) ?? null)
    const anonymousId = anonymousSockets.get(socket.id)

    // Clean up any existing sessions for this user
    sessions.forEach((existingSession, existingSessionId) => {
      const isSameUser = (
        (userId && existingSession.userId === userId) ||
        (anonymousId && existingSession.socketId === socket.id)
      )

      if (isSameUser && existingSessionId !== sessionData.id) {
        console.log(`Removing duplicate session ${existingSessionId} for user ${userId || anonymousId}`)
        sessions.delete(existingSessionId)
      }
    })

    const startTime = Date.now()
    const sessionRecord: PomodoroSession = {
      ...sessionData,
      status: sessionData.status ?? 'ACTIVE',
      timeRemaining: sessionData.timeRemaining ?? sessionData.duration * 60,
      socketId: socket.id,
      startTime,
    }

    // Send system message about session start - use data from sessionData
    let username = sessionData.username || 'Guest'
    let avatarUrl = sessionData.avatarUrl

    // Fallback to maps if sessionData doesn't have the info
    if (!username || username === 'Guest') {
      if (userId) {
        username = userNames.get(userId) ?? `User-${userId.slice(0, 6)}`
        avatarUrl = userAvatars.get(userId)
      } else if (anonymousId) {
        username = `Guest-${anonymousId.slice(-4)}`
      }
    }

    sessionRecord.username = username
    sessionRecord.avatarUrl = avatarUrl

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
      avatarUrl,
      text: '',
      timestamp: Date.now(),
      type: 'system',
      action: {
        type: actionType,
        ...(actionType === 'work_start' && { 
          duration: sessionData.duration,
          task: sessionData.task 
        })
      }
    }

    // Store locally and broadcast
    chatMessages.push(systemMessage)
    if (chatMessages.length > MAX_CHAT_HISTORY) {
      chatMessages.splice(0, chatMessages.length - MAX_CHAT_HISTORY)
    }
    
    // Save to database
    const savedMessage = await saveSystemMessageToDB(systemMessage)
    if (savedMessage?.id) {
      systemMessage.id = savedMessage.id
    }
    sessionRecord.chatMessageId = systemMessage.id

    // Replace message in history with persisted ID if needed
    const lastIndex = chatMessages.length - 1
    if (lastIndex >= 0) {
      chatMessages[lastIndex] = systemMessage
    }

    sessions.set(sessionData.id, sessionRecord)
    
    io.emit('chat-new', systemMessage)

    io.emit('session-update', serializeSessions())
  })

  socket.on('session-sync', (sessionData: PomodoroSession) => {
    // Remove any existing sessions for this user/socket to prevent duplicates
    const userId = sessionData.userId || (socketUserMap.get(socket.id) ?? null)
    const anonymousId = anonymousSockets.get(socket.id)
    
    // Clean up any existing sessions for this user (but don't remove the one we're syncing)
    sessions.forEach((existingSession, existingSessionId) => {
      const isSameUser = (
        (userId && existingSession.userId === userId) ||
        (anonymousId && existingSession.socketId === socket.id)
      )
      
      if (isSameUser && existingSessionId !== sessionData.id) {
        console.log(`Removing duplicate session ${existingSessionId} during sync for user ${userId || anonymousId}`)
        sessions.delete(existingSessionId)
      }
    })

    const existingSession = sessions.get(sessionData.id)

    // Sync existing session without sending system message
    const effectiveTimeRemaining = typeof sessionData.timeRemaining === 'number'
      ? sessionData.timeRemaining
      : existingSession?.timeRemaining ?? sessionData.duration * 60

    const syncStartTime = Date.now() - (sessionData.duration * 60 * 1000 - effectiveTimeRemaining * 1000)

    sessions.set(sessionData.id, {
      ...sessionData,
      status: sessionData.status ?? existingSession?.status ?? 'ACTIVE',
      timeRemaining: effectiveTimeRemaining,
      socketId: socket.id,
      startTime: syncStartTime,
      chatMessageId: existingSession?.chatMessageId,
      username: existingSession?.username || sessionData.username,
      avatarUrl: existingSession?.avatarUrl || sessionData.avatarUrl,
    })

    io.emit('session-update', serializeSessions())
  })

  socket.on('session-pause', (sessionId: string) => {
    const session = sessions.get(sessionId)
    if (!session) {
      return
    }

    session.status = 'PAUSED'
    io.emit('session-update', serializeSessions())
  })

  socket.on('session-end', async (payload: { sessionId: string; reason?: 'manual' | 'completed' | 'reset'; removeActivity?: boolean }) => {
    const sessionId = payload?.sessionId
    const reason = payload?.reason ?? 'manual'
    const session = sessions.get(sessionId)
    
    if (!session) {
      return // Session doesn't exist, nothing to do
    }

    const shouldRemoveActivity = reason === 'manual' && (
      payload?.removeActivity ||
      (Date.now() - session.startTime < 60 * 1000)
    )

    // Send system message only when session is completed (timer finished)
    if (reason === 'completed' && session.type === 'WORK') {
      const userId = session.userId || (socketUserMap.get(socket.id) ?? null)
      const anonymousId = anonymousSockets.get(socket.id)
      let username = session.username || 'Guest'
      let avatarUrl = session.avatarUrl

      // Fallback to maps if session doesn't have the info
      if (!username || username === 'Guest') {
        if (userId) {
          username = userNames.get(userId) ?? `User-${userId.slice(0, 6)}`
          avatarUrl = userAvatars.get(userId)
        } else if (anonymousId) {
          username = `Guest-${anonymousId.slice(-4)}`
        }
      }

      const systemMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId,
        username,
        avatarUrl,
        text: '',
        timestamp: Date.now(),
        type: 'system',
        action: {
          type: 'session_complete',
          task: session.task,
          duration: session.duration
        }
      }

      // Store locally and broadcast
      chatMessages.push(systemMessage)
      if (chatMessages.length > MAX_CHAT_HISTORY) {
        chatMessages.splice(0, chatMessages.length - MAX_CHAT_HISTORY)
      }
      
      // Save to database
      saveSystemMessageToDB(systemMessage)
      
      io.emit('chat-new', systemMessage)
    }

    if (shouldRemoveActivity && session.chatMessageId) {
      const index = chatMessages.findIndex((message) => message.id === session.chatMessageId)
      if (index !== -1) {
        chatMessages.splice(index, 1)
      }
      io.emit('chat-remove', session.chatMessageId)
      await deleteSystemMessageFromDB(session.chatMessageId, session.id)
    }

    // Only delete the specific session that belongs to this socket
    if (session.socketId === socket.id) {
      sessions.delete(sessionId)
      io.emit('session-update', serializeSessions())
    }
  })

  socket.on('timer-tick', (payload?: { sessionId: string; timeRemaining: number }) => {
    if (!payload?.sessionId) return
    const session = sessions.get(payload.sessionId)
    if (!session) {
      return
    }

    // Update time and bind to current socket (if user returned)
    session.timeRemaining = Number(payload.timeRemaining) || 0
    session.lastUpdate = Date.now()
    session.socketId = socket.id

    if (payload.timeRemaining % 30 === 0) {
      io.emit('session-update', serializeSessions())
    }
  })

  socket.on('get-active-sessions', async () => {
    // Load fresh data from DB before sending
    await loadActiveSessionsFromDB()
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

    // НЕ удаляем сессии при отключении - они остаются в памяти и в БД
    // Только убираем привязку к socketId
    sessions.forEach((session, sessionId) => {
      if (session.socketId === socket.id) {
        // Обновляем lastUpdate чтобы знать, что сокет отключился
        session.lastUpdate = Date.now()
        // Убираем привязку к сокету
        delete session.socketId
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

app.post('/admin/reset-presence', (_req, res) => {
  // Сброс всех данных о присутствии
  onlineUsers.clear()
  userConnectionCounts.clear()
  socketUserMap.clear()
  anonymousSockets.clear()
  anonymousConnectionCounts.clear()
  userNames.clear()
  
  emitPresenceSnapshot()
  
  res.json({ 
    status: 'reset', 
    message: 'All presence data has been reset',
    timestamp: Date.now()
  })
})

app.get('/admin/presence-debug', (_req, res) => {
  const activeSockets = Array.from(io.sockets.sockets.keys())
  
  res.json({
    onlineUsers: Array.from(onlineUsers.keys()),
    userConnectionCounts: Object.fromEntries(userConnectionCounts),
    socketUserMap: Object.fromEntries(socketUserMap),
    anonymousConnectionCounts: Object.fromEntries(anonymousConnectionCounts),
    activeSockets: activeSockets.length,
    timestamp: Date.now()
  })
})

const port = Number(process.env.PORT) || 4000

server.listen(port, () => {
  console.log(`Socket server listening on port ${port}`)
})
