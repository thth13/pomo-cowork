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
  roomId?: string | null
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
  roomId?: string | null
  text: string
  timestamp: number
  type?: 'message' | 'system'
  action?: {
    type: 'work_start' | 'break_start' | 'long_break_start' | 'timer_stop' | 'session_complete' | 'time_tracking_start'
    duration?: number
    task?: string
  }
}

interface LastSeenResponse {
  success: boolean
  lastSeenAt?: string | null
}

const app = express()
const server: Server = http.createServer(app)

app.use(express.json())

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
const chatMessagesByRoom = new Map<string, ChatMessage[]>()
const reactionsByTarget = new Map<string, Map<string, string>>()

const MAX_CHAT_HISTORY = 100

const normalizeRoomId = (roomId?: string | null) => {
  if (typeof roomId !== 'string') return null
  const trimmed = roomId.trim()
  return trimmed ? trimmed : null
}

const getRoomKey = (roomId?: string | null) => normalizeRoomId(roomId) ?? 'global'

const getChatHistoryForRoom = (roomId?: string | null) => {
  const key = getRoomKey(roomId)
  return chatMessagesByRoom.get(key) ?? []
}

const pushChatMessageForRoom = (message: ChatMessage) => {
  const key = getRoomKey(message.roomId ?? null)
  const arr = chatMessagesByRoom.get(key) ?? []
  arr.push(message)
  if (arr.length > MAX_CHAT_HISTORY) {
    arr.splice(0, arr.length - MAX_CHAT_HISTORY)
  }
  chatMessagesByRoom.set(key, arr)
}

const buildReactionCounts = (targetMap?: Map<string, string>) => {
  const counts: Record<string, number> = {}
  if (!targetMap) return counts
  targetMap.forEach((emoji) => {
    counts[emoji] = (counts[emoji] ?? 0) + 1
  })
  return counts
}

const serializeReactionCounts = () => {
  const result: Record<string, Record<string, number>> = {}
  reactionsByTarget.forEach((targetMap, targetUserId) => {
    const counts = buildReactionCounts(targetMap)
    if (Object.keys(counts).length > 0) {
      result[targetUserId] = counts
    }
  })
  return result
}

const getMyReactionsForUser = (userId: string) => {
  const result: Record<string, string> = {}
  reactionsByTarget.forEach((targetMap, targetUserId) => {
    const emoji = targetMap.get(userId)
    if (emoji) {
      result[targetUserId] = emoji
    }
  })
  return result
}

// URL to Next.js API
const API_URL = process.env.API_URL || 'http://localhost:3000'

// Function to save system messages to database via API
const saveSystemMessageToDB = async (message: ChatMessage) => {
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3000'
    const response = await axios.post(`${apiUrl}/api/chat/messages`, {
      userId: message.userId,
      username: message.username,
      roomId: message.roomId ?? null,
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

const updateLastSeenAt = async (userId: string) => {
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3000'
    await axios.post<LastSeenResponse>(`${apiUrl}/api/users/${userId}/last-seen`, {
      lastSeenAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to update lastSeenAt:', error)
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
    void updateLastSeenAt(userId)
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
      avatarUrl?: string
      roomId?: string | null
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
          avatarUrl: dbSession.avatarUrl ?? userAvatars.get(dbSession.userId),
          roomId: dbSession.roomId ?? null,
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

        existingSession.roomId = dbSession.roomId ?? existingSession.roomId ?? null

        // Always update avatarUrl from DB if available
        if (dbSession.avatarUrl) {
          existingSession.avatarUrl = dbSession.avatarUrl
        }
      }

      if (dbSession.avatarUrl) {
        userAvatars.set(dbSession.userId, dbSession.avatarUrl)
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
    roomId: session.roomId ?? null,
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
      void updateLastSeenAt(userId)
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

  socket.on('chat-send', (payload: { text: string; userId?: string | null; username?: string; avatarUrl?: string | null; roomId?: string | null }) => {
      const normalizedRoomId = normalizeRoomId(payload?.roomId ?? null)
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
      roomId: normalizedRoomId,
      text: rawText,
      timestamp: Date.now()
    }

    // Store locally and broadcast
    pushChatMessageForRoom(localMessage)
    
    // Broadcast to all other clients (not sender)
    socket.broadcast.emit('chat-new', localMessage)
  })

  socket.on('chat-history', (payload?: { roomId?: string | null }) => {
    const roomId = normalizeRoomId(payload?.roomId ?? null)
    socket.emit('chat-history', getChatHistoryForRoom(roomId))
  })

  socket.on('chat-typing', (payload: { isTyping: boolean; userId?: string | null; username?: string; avatarUrl?: string | null; roomId?: string | null }) => {
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
    const roomId = normalizeRoomId(payload?.roomId ?? null)
    socket.broadcast.emit('chat-typing', {
      username,
      isTyping: Boolean(payload?.isTyping),
      roomId
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

    let actionType: 'work_start' | 'break_start' | 'long_break_start' | 'time_tracking_start'
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
      case 'TIME_TRACKING':
        actionType = 'time_tracking_start'
        break
      default:
        actionType = 'work_start'
    }

    const systemMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      username,
      avatarUrl,
      roomId: sessionRecord.roomId ?? null,
      text: '',
      timestamp: Date.now(),
      type: 'system',
      action: {
        type: actionType,
        ...(actionType === 'work_start' && { 
          duration: sessionData.duration,
          task: sessionData.task 
        }),
        ...(actionType === 'time_tracking_start' && {
          task: sessionData.task
        })
      }
    }

    // Store locally and broadcast
    const tempId = systemMessage.id
    pushChatMessageForRoom(systemMessage)

    // Save to database
    const savedMessage = await saveSystemMessageToDB(systemMessage)
    if (savedMessage?.id) {
      systemMessage.id = savedMessage.id
    }
    sessionRecord.chatMessageId = systemMessage.id

    // Replace message in per-room history with persisted ID if needed
    if (systemMessage.id !== tempId) {
      const key = getRoomKey(systemMessage.roomId ?? null)
      const history = chatMessagesByRoom.get(key)
      if (history) {
        const idx = history.findIndex((m) => m.id === tempId)
        if (idx !== -1) {
          history[idx] = systemMessage
          chatMessagesByRoom.set(key, history)
        }
      }
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
        roomId: session.roomId ?? null,
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
      pushChatMessageForRoom(systemMessage)
      
      // Save to database (best-effort)
      const tempId = systemMessage.id
      const saved = await saveSystemMessageToDB(systemMessage)
      if (saved?.id) {
        systemMessage.id = saved.id

        // Replace message in per-room history with persisted ID if needed
        const key = getRoomKey(systemMessage.roomId ?? null)
        const history = chatMessagesByRoom.get(key)
        if (history) {
          const idx = history.findIndex((m) => m.id === tempId)
          if (idx !== -1) {
            history[idx] = systemMessage
            chatMessagesByRoom.set(key, history)
          }
        }
      }
      
      io.emit('chat-new', systemMessage)
    }

    if (shouldRemoveActivity && session.chatMessageId) {
      const key = getRoomKey(session.roomId ?? null)
      const history = chatMessagesByRoom.get(key)
      if (history) {
        const index = history.findIndex((message) => message.id === session.chatMessageId)
        if (index !== -1) {
          history.splice(index, 1)
          chatMessagesByRoom.set(key, history)
        }
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

  socket.on('get-reactions', (payload?: { userId?: string | null }) => {
    const userId = typeof payload?.userId === 'string' ? payload.userId : null
    socket.emit('reaction-snapshot', {
      countsByTarget: serializeReactionCounts(),
      myReactionsByTarget: userId ? getMyReactionsForUser(userId) : {}
    })
  })

  socket.on('reaction-set', (payload: { fromUserId: string; toUserId: string; emoji: string }) => {
    if (!payload?.fromUserId || !payload?.toUserId || !payload?.emoji) return
    const targetMap = reactionsByTarget.get(payload.toUserId) ?? new Map<string, string>()
    const previousEmoji = targetMap.get(payload.fromUserId) ?? null
    targetMap.set(payload.fromUserId, payload.emoji)
    reactionsByTarget.set(payload.toUserId, targetMap)

    io.emit('reaction-update', {
      action: 'set',
      toUserId: payload.toUserId,
      fromUserId: payload.fromUserId,
      emoji: payload.emoji,
      previousEmoji,
      counts: buildReactionCounts(targetMap)
    })
  })

  socket.on('reaction-remove', (payload: { fromUserId: string; toUserId: string }) => {
    if (!payload?.fromUserId || !payload?.toUserId) return
    const targetMap = reactionsByTarget.get(payload.toUserId)
    if (!targetMap) return
    const previousEmoji = targetMap.get(payload.fromUserId) ?? null
    if (!previousEmoji) return
    targetMap.delete(payload.fromUserId)
    if (targetMap.size === 0) {
      reactionsByTarget.delete(payload.toUserId)
    } else {
      reactionsByTarget.set(payload.toUserId, targetMap)
    }

    io.emit('reaction-update', {
      action: 'remove',
      toUserId: payload.toUserId,
      fromUserId: payload.fromUserId,
      emoji: previousEmoji,
      previousEmoji,
      counts: buildReactionCounts(targetMap)
    })
  })

  socket.on('tomato-throw', (payload: { fromUserId: string; toUserId: string; fromUsername: string; x?: number; y?: number }) => {
    // Broadcast tomato throw to all clients
    io.emit('tomato-receive', {
      id: `tomato-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fromUserId: payload.fromUserId,
      toUserId: payload.toUserId,
      fromUsername: payload.fromUsername,
      timestamp: Date.now(),
      x: payload.x,
      y: payload.y
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

app.post('/chat/remove', (req, res) => {
  const ids: unknown = req.body?.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids_required' })
  }

  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => typeof id === 'string')))
  const removedIds: string[] = []

  uniqueIds.forEach((id) => {
    // Remove from any room history that contains the message
    for (const [key, history] of chatMessagesByRoom.entries()) {
      const index = history.findIndex((message) => message.id === id)
      if (index !== -1) {
        history.splice(index, 1)
        chatMessagesByRoom.set(key, history)
        break
      }
    }
    removedIds.push(id)
    io.emit('chat-remove', id)
  })

  res.json({ removed: removedIds })
})

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
