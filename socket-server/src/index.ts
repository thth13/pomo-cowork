import dotenv from 'dotenv'
import express from 'express'
import type { Server } from 'http'
import http from 'http'
import cors from 'cors'
import { Server as IOServer, type Socket as IOSocket } from 'socket.io'
import axios from 'axios'

dotenv.config()

interface PomodoroSession {
  id: string
  userId: string
  username: string
  avatarUrl?: string
  experience?: number
  isPro?: boolean
  roomId?: string | null
  task: string
  type: string
  timeRemaining: number
  startedAt: string
  updatedAt?: string
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
// Activity survives disconnects without keeping the timer in the online list.
const sessionActivity = new Map<string, { session: PomodoroSession; touchedAt: number }>()
const startOperations = new Map<string, Promise<void>>()
const endOperations = new Map<string, Promise<void>>()
const ACTIVITY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
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
  const existing = arr.findIndex(item => item.id === message.id)
  if (existing === -1) arr.push(message)
  else arr[existing] = message
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

const clearReactionsTargetingUser = (userId: string, ioServer: IOServer) => {
  const targetMap = reactionsByTarget.get(userId)
  if (targetMap) {
    targetMap.forEach((emoji, fromUserId) => {
      targetMap.delete(fromUserId)
      ioServer.emit('reaction-update', {
        action: 'remove',
        toUserId: userId,
        fromUserId,
        emoji,
        previousEmoji: emoji,
        counts: buildReactionCounts(targetMap)
      })
    })
    reactionsByTarget.delete(userId)
  }
}

// URL to Next.js API
const API_URL = process.env.API_URL || 'http://localhost:3000'

// Function to save system messages to database via API
const saveSystemMessageToDB = async (message: ChatMessage, token?: string | null) => {
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3000'
    const response = await axios.post(`${apiUrl}/api/chat/messages`, {
      userId: message.userId,
      username: message.username,
      roomId: message.roomId ?? null,
      type: 'system',
      action: message.action
    }, { timeout: 10000, headers: token ? { Authorization: `Bearer ${token}` } : undefined })
    return response.data as { id: string } | null
  } catch (error) {
    console.error('Failed to save system message to database:', axios.isAxiosError(error) ? error.response?.status ?? error.code : 'unknown')
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
    await axios.delete(url.toString(), { timeout: 10000 })
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

const serializeSessions = () =>
  Array.from(sessions.values()).map((session) => ({
    id: session.id,
    userId: session.userId,
    username: session.username,
    avatarUrl: session.avatarUrl,
    experience: session.experience ?? 0,
    isPro: session.isPro ?? false,
    roomId: session.roomId ?? null,
    task: session.task,
    type: session.type,
    duration: session.duration,
    timeRemaining: session.timeRemaining,
    startedAt: session.startedAt,
    status: session.status
  }))

interface RoomViewerAccess {
  token: string | null
  clientVersion: number | null
  status: 'loading' | 'ready' | 'error'
  generation: number
  roomIds: Set<string>
  expiresAt: number
  lastAttempt: number
  pending: Promise<void> | null
  refreshRequested: boolean
}

const roomViewerAccess = new Map<string, RoomViewerAccess>()
const ROOM_ACCESS_TTL_MS = 30_000

const viewerCanAccessRoom = (socketId: string, roomId?: string | null) => {
  const normalized = normalizeRoomId(roomId)
  if (!normalized) return true
  const access = roomViewerAccess.get(socketId)
  return Boolean(access && access.expiresAt > Date.now() && access.roomIds.has(normalized))
}

const emitSessionSnapshot = (socket: IOSocket, snapshot = serializeSessions()) => {
  if (!socket.connected) return
  const access = roomViewerAccess.get(socket.id)
  const status = access?.status === 'error' ? 'error'
    : access?.status === 'ready' && access.expiresAt > Date.now() ? 'ready' : 'loading'
  socket.emit('session-update', snapshot.filter(session => viewerCanAccessRoom(socket.id, session.roomId)), {
    version: access?.clientVersion ?? null,
    status,
    roomIds: status === 'ready' && access ? [...access.roomIds] : [],
  })
}

// Only the authenticated API decides access. Presence user IDs are client claims.
const refreshRoomAccess = (socket: IOSocket, force = false): Promise<void> => {
  const access = roomViewerAccess.get(socket.id)
  if (!access || !socket.connected) return Promise.resolve()
  if (access.pending) {
    if (force) access.refreshRequested = true
    return access.pending
  }
  if (!force && access.expiresAt > Date.now() + 5000) return Promise.resolve()
  const generation = access.generation
  const token = access.token
  if (access.status !== 'ready' || access.expiresAt <= Date.now()) {
    access.status = 'loading'
    emitSessionSnapshot(socket)
  }
  const delay = Math.max(0, access.lastAttempt + 1000 - Date.now())
  const request: Promise<void> = (async () => {
    if (delay > 0) await new Promise<void>(resolve => setTimeout(resolve, delay))
    if (!socket.connected || access.generation !== generation) return
    access.lastAttempt = Date.now()
    try {
      const { data } = await axios.get<Array<{ id: string }>>(`${API_URL}/api/rooms`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        timeout: 5000,
      })
      if (!socket.connected || roomViewerAccess.get(socket.id) !== access || access.generation !== generation) return
      if (!Array.isArray(data)) throw new Error('Invalid room access response')
      access.roomIds = new Set(data.filter(room => room && typeof room.id === 'string').map(room => room.id))
      access.expiresAt = Date.now() + ROOM_ACCESS_TTL_MS
      access.status = 'ready'
    } catch {
      if (!socket.connected || roomViewerAccess.get(socket.id) !== access || access.generation !== generation) return
      access.roomIds.clear()
      access.status = 'error'
      // Fail closed and bound retries if the application API is unavailable.
      access.expiresAt = Date.now() + 10_000
    }
    emitSessionSnapshot(socket)
  })().finally(() => {
    if (access.pending === request) access.pending = null
    if (socket.connected && roomViewerAccess.get(socket.id) === access && (access.generation !== generation || access.refreshRequested)) {
      access.refreshRequested = false
      void refreshRoomAccess(socket, true)
    }
  })
  access.pending = request
  return request
}

const setRoomAccessToken = (socket: IOSocket, value?: string | null, clientVersion?: number) => {
  const token = typeof value === 'string' && value.length <= 8192 && value ? value : null
  const previous = roomViewerAccess.get(socket.id)
  const version = typeof clientVersion === 'number' && Number.isSafeInteger(clientVersion) && clientVersion > 0
    ? clientVersion : previous?.clientVersion ?? null
  if (!previous) {
    roomViewerAccess.set(socket.id, { token, clientVersion: version, status: 'loading', generation: 0, roomIds: new Set(), expiresAt: 0, lastAttempt: 0, pending: null, refreshRequested: false })
  } else if (previous.token !== token || previous.clientVersion !== version) {
    previous.token = token
    previous.clientVersion = version
    previous.status = 'loading'
    previous.generation += 1
    previous.roomIds.clear()
    previous.expiresAt = 0
    emitSessionSnapshot(socket)
  }
  void refreshRoomAccess(socket)
}

const canReadRoom = async (socket: IOSocket, roomId?: string | null) => {
  if (!normalizeRoomId(roomId)) return socket.connected
  if (!viewerCanAccessRoom(socket.id, roomId)) {
    await refreshRoomAccess(socket, true)
    // A token change or forced membership refresh may have superseded that read.
    await roomViewerAccess.get(socket.id)?.pending
  }
  return socket.connected && viewerCanAccessRoom(socket.id, roomId)
}

const broadcastSessionSnapshots = () => {
  const snapshot = serializeSessions()
  for (const socket of io.sockets.sockets.values()) {
    emitSessionSnapshot(socket, snapshot)
    void refreshRoomAccess(socket)
  }
}

const emitRoomEvent = (event: string, payload: unknown, roomId?: string | null, exceptSocketId?: string) => {
  for (const socket of io.sockets.sockets.values()) {
    if (socket.id !== exceptSocketId && viewerCanAccessRoom(socket.id, roomId)) socket.emit(event, payload)
  }
}

setInterval(() => {
  for (const socket of io.sockets.sockets.values()) {
    const access = roomViewerAccess.get(socket.id)
    if (access && access.expiresAt <= Date.now()) emitSessionSnapshot(socket)
    void refreshRoomAccess(socket)
  }
}, 5000)

// Periodic cleanup of outdated sessions (every minute)
setInterval(() => {
  for (const [id, activity] of sessionActivity) {
    if (!sessions.has(id) && Date.now() - activity.touchedAt > ACTIVITY_RETENTION_MS) {
      sessionActivity.delete(id)
      startOperations.delete(id)
      endOperations.delete(id)
    }
  }
  let cleaned = 0
  sessions.forEach((session, sessionId) => {
    const elapsed = (Date.now() - session.startTime) / 1000
    if (session.status !== 'PAUSED' && elapsed > session.duration * 60 + 300) {
      sessions.delete(sessionId)
      cleaned += 1
    }
  })

  if (cleaned > 0) {
    broadcastSessionSnapshots()
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

interface ChatAuthor {
  id: string
  username: string
  avatarUrl?: string | null
  isAnonymous: boolean
}

io.on('connection', (socket) => {
  let chatHistoryRequest = 0
  let presenceGeneration = 0
  let presenceReady: Promise<void> = Promise.resolve()
  let presenceFailed = false
  let retryPresence: (() => Promise<void>) | null = null
  let sessionSyncSequence = 0
  // Share short-lived verification between typing events and message sends.
  let chatAuth: { token: string; expiresAt: number; author: Promise<ChatAuthor | null> } | null = null
  const resolveAuthor = async (token?: string): Promise<ChatAuthor | null> => {
    if (typeof token !== 'string' || !token) return null
    if (!chatAuth || chatAuth.token !== token || chatAuth.expiresAt <= Date.now()) {
      const author = axios.get<ChatAuthor>(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      }).then(({ data }) => data.id && !data.isAnonymous ? data : null).catch(error => {
        if (axios.isAxiosError(error) && [401, 403, 404].includes(error.response?.status ?? 0)) return null
        throw new Error('Identity verification unavailable')
      })
      const attempt = { token, expiresAt: Date.now() + 30_000, author }
      chatAuth = attempt
      void author.catch(() => { if (chatAuth === attempt) chatAuth = null })
    }
    return chatAuth.author
  }
  const ensurePresence = async () => {
    await presenceReady
    if (presenceFailed && retryPresence) {
      presenceReady = retryPresence()
      await presenceReady
    }
    if (presenceFailed) throw new Error('Identity verification unavailable')
  }
  const getChatAuthor = async (token?: string): Promise<ChatAuthor | null> => {
    try { await ensurePresence() } catch { return null }
    const author = await resolveAuthor(token).catch(() => null)
    if (!socket.connected || !author || socketUserMap.get(socket.id) !== author.id || anonymousSockets.has(socket.id)) return null
    return author
  }
  emitPresenceSnapshot()
  
  // Online sessions are owned exclusively by connected clients.
  setRoomAccessToken(socket, null)
  emitSessionSnapshot(socket)

  const applyPresence = (author: ChatAuthor | null, anonymousId: string | null) => {
    const userId = author?.id ?? null
    const username = author?.username
    const avatarUrl = author?.avatarUrl
    const previousUserId = socketUserMap.get(socket.id)
    const previousAnonymousId = anonymousSockets.get(socket.id)
    if (previousUserId && previousUserId !== userId) {
      socket.leave(`user-${previousUserId}`)
      socketUserMap.delete(socket.id)
      decrementUserConnection(previousUserId)
    }
    if ((previousUserId && previousUserId !== userId) ||
        (previousAnonymousId && previousAnonymousId !== anonymousId)) {
      sessions.forEach((session, sessionId) => {
        if (session.socketId === socket.id) sessions.delete(sessionId)
      })
      broadcastSessionSnapshots()
    }

    if (userId) {
      socket.join(`user-${userId}`)
      socketUserMap.set(socket.id, userId)
      if (username) {
        userNames.set(userId, username)
      }
      if (avatarUrl) {
        userAvatars.set(userId, avatarUrl)
      } else {
        userAvatars.delete(userId)
      }
      if (previousUserId !== userId) incrementUserConnection(userId)
    }

    if (anonymousId) {
      addAnonymousConnection(anonymousId, socket.id)
    } else {
      removeAnonymousConnectionBySocket(socket.id)
    }

    emitPresenceSnapshot()
  }

  socket.on('join-presence', (payload?: { token?: string; anonymousId?: string | null; accessVersion?: number }) => {
    const token = typeof payload?.token === 'string' && payload.token && payload.token.length <= 8192 ? payload.token : undefined
    const anonymousId = typeof payload?.anonymousId === 'string' &&
      /^anon_(?:\d+_[a-z0-9]+|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(payload.anonymousId)
      ? payload.anonymousId : null
    const previousAccess = roomViewerAccess.get(socket.id)
    const identityChanged = (previousAccess?.token ?? null) !== (token ?? null) ||
      (!token && (anonymousSockets.get(socket.id) ?? null) !== anonymousId)
    if (identityChanged || (typeof payload?.accessVersion === 'number' && payload.accessVersion !== previousAccess?.clientVersion)) presenceGeneration += 1
    const generation = presenceGeneration
    if (identityChanged) applyPresence(null, null)
    setRoomAccessToken(socket, token, payload?.accessVersion)
    presenceFailed = false
    retryPresence = async () => {
      try {
        const author = token ? await resolveAuthor(token) : null
        if (!socket.connected || generation !== presenceGeneration) return
        presenceFailed = false
        applyPresence(author, token ? null : anonymousId)
      } catch {
        if (!socket.connected || generation !== presenceGeneration) return
        presenceFailed = true
        applyPresence(null, null)
      }
    }
    presenceReady = retryPresence()
  })

  const verifyPublishedSession = async (id: string, presenceToken?: string) => {
    const generation = presenceGeneration
    await ensurePresence()
    if (!socket.connected || generation !== presenceGeneration) return null
    const ownerId = socketUserMap.get(socket.id) ?? anonymousSockets.get(socket.id)
    if (!ownerId || typeof id !== 'string' || !id || id.length > 128) return null
    const token = roomViewerAccess.get(socket.id)?.token ?? null
    try {
      const { data } = await axios.post<{ userId: string; session: PomodoroSession | null }>(
        `${API_URL}/api/sessions/${encodeURIComponent(id)}/presence`,
        { anonymousId: anonymousSockets.get(socket.id), presenceToken },
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined, timeout: 5000 },
      )
      if (!socket.connected || generation !== presenceGeneration || data.userId !== ownerId ||
          (data.session && (data.session.id !== id || data.session.userId !== ownerId))) return null
      return { ...data, token }
    } catch (error) {
      if (axios.isAxiosError(error) && [400, 401, 403, 404].includes(error.response?.status ?? 0)) return null
      throw new Error('Session verification unavailable')
    }
  }

  socket.on('chat-send', async (payload: { text: string; messageId?: string; token?: string; roomId?: string | null }) => {
    const initialGeneration = roomViewerAccess.get(socket.id)?.generation
    const normalizedRoomId = normalizeRoomId(payload?.roomId ?? null)
    const rawText = (payload?.text ?? '').toString().slice(0, 1000)
    if (!rawText.trim()) return

    const author = await getChatAuthor(payload?.token)
    if (!author || initialGeneration !== roomViewerAccess.get(socket.id)?.generation) return
    setRoomAccessToken(socket, payload.token)
    const generation = roomViewerAccess.get(socket.id)?.generation
    if (!await canReadRoom(socket, normalizedRoomId) || socketUserMap.get(socket.id) !== author.id || roomViewerAccess.get(socket.id)?.token !== payload.token || generation !== roomViewerAccess.get(socket.id)?.generation) return
    const userId = author.id
    const username = author.username
    const avatarUrl = author.avatarUrl || undefined

    let localMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      username,
      avatarUrl,
      roomId: normalizedRoomId,
      text: rawText,
      timestamp: Date.now()
    }

    if (payload.messageId !== undefined) {
      if (typeof payload.messageId !== 'string' || !payload.messageId || payload.messageId.length > 128) return
      try {
        const { data } = await axios.get<ChatMessage>(`${API_URL}/api/chat/messages/${encodeURIComponent(payload.messageId)}`, {
          headers: { Authorization: `Bearer ${payload.token}` }, timeout: 5000,
        })
        if (!socket.connected || data.userId !== author.id || data.id !== payload.messageId ||
            normalizeRoomId(data.roomId) !== normalizedRoomId || generation !== roomViewerAccess.get(socket.id)?.generation ||
            socketUserMap.get(socket.id) !== author.id) return
        localMessage = data
      } catch { return }
    }

    // Store locally and broadcast
    pushChatMessageForRoom(localMessage)
    
    // Broadcast to all other clients (not sender)
    emitRoomEvent('chat-new', localMessage, normalizedRoomId, socket.id)
  })

  socket.on('chat-history', async (payload?: { roomId?: string | null; requestId?: string }) => {
    const requestId = payload?.requestId
    if (requestId !== undefined && (typeof requestId !== 'string' || !requestId || requestId.length > 128)) return
    const requestSequence = ++chatHistoryRequest
    const generation = roomViewerAccess.get(socket.id)?.generation
    const roomId = normalizeRoomId(payload?.roomId ?? null)
    const allowed = await canReadRoom(socket, roomId)
    if (!socket.connected || requestSequence !== chatHistoryRequest || generation !== roomViewerAccess.get(socket.id)?.generation) return
    const messages = allowed ? getChatHistoryForRoom(roomId) : []
    // Empty and denied histories still identify the request they answer. Keep
    // array responses for older clients during the app/socket deployment.
    socket.emit('chat-history', requestId ? { requestId, roomId, messages } : messages)
  })

  socket.on('chat-typing', async (payload: { isTyping: boolean; token?: string; roomId?: string | null }) => {
    const initialGeneration = roomViewerAccess.get(socket.id)?.generation
    const author = await getChatAuthor(payload?.token)
    if (!author || initialGeneration !== roomViewerAccess.get(socket.id)?.generation) return
    const username = author.username
    const roomId = normalizeRoomId(payload?.roomId ?? null)
    setRoomAccessToken(socket, payload.token)
    const generation = roomViewerAccess.get(socket.id)?.generation
    if (!await canReadRoom(socket, roomId) || socketUserMap.get(socket.id) !== author.id || roomViewerAccess.get(socket.id)?.token !== payload.token || generation !== roomViewerAccess.get(socket.id)?.generation) return
    emitRoomEvent('chat-typing', {
      username,
      isTyping: Boolean(payload?.isTyping),
      roomId
    }, roomId, socket.id)
  })

  // Preserve this connection's start/end order while API verification is async.
  // Unverified IDs only queue locally; they cannot occupy another socket's operation.
  const lifecycleRequests = new Map<string, Promise<void>>()
  const registerSessionEvent = <T,>(
    event: string,
    operations: Map<string, Promise<void>>,
    identify: (payload: T) => { id: string; presenceToken?: string },
    prepare: (payload: T, session: PomodoroSession | null) => T | null,
    handle: (payload: T, operationToken: string | null) => Promise<void>,
  ) => {
    socket.on(event, (payload: T, acknowledge?: (accepted: boolean) => void) => {
      const { id, presenceToken } = identify(payload)
      if (typeof id !== 'string' || !id || id.length > 128) {
        if (typeof acknowledge === 'function') acknowledge(true)
        return
      }
      const generation = presenceGeneration
      const request = Promise.resolve(lifecycleRequests.get(id)).catch(() => {}).then(async () => {
        if (!socket.connected || generation !== presenceGeneration) return
        const verified = await verifyPublishedSession(id, presenceToken)
        if (!verified) return
        let operation = operations.get(id)
        if (!operation) {
          const cached = sessions.get(id) ?? sessionActivity.get(id)?.session
          const session = verified.session ?? (cached?.userId === verified.userId ? cached : null)
          // Deleted sessions may be retracted from our verified cache, never created.
          const prepared = prepare(payload, event === 'session-start' ? verified.session : session)
          if (prepared) {
            operation = Promise.resolve().then(() => handle(prepared, verified.token))
            operations.set(id, operation)
            void operation.catch(() => { if (operations.get(id) === operation) operations.delete(id) })
          }
        }
        await operation
      })
      lifecycleRequests.set(id, request)
      void request.then(() => {
        if (typeof acknowledge === 'function') acknowledge(true)
      }, () => {
        // Transient API failures retry without publishing unverified claims.
        if (typeof acknowledge === 'function') acknowledge(false)
      }).finally(() => {
        if (lifecycleRequests.get(id) === request) lifecycleRequests.delete(id)
      })
    })
  }

  registerSessionEvent('session-start', startOperations,
    (data: PomodoroSession & { activityOnly?: boolean; presenceToken?: string }) => ({ id: data?.id, presenceToken: data?.presenceToken }),
    (_payload, session) => session ? { ...session, activityOnly: true } : null,
    async (sessionData, operationToken) => {
    const userId = sessionData.userId
    const anonymousId = anonymousSockets.get(socket.id)

    const startTime = new Date(sessionData.startedAt).getTime() || Date.now()
    const sessionRecord: PomodoroSession = {
      ...sessionData,
      status: sessionData.status ?? 'ACTIVE',
      timeRemaining: sessionData.timeRemaining ?? sessionData.duration * 60,
      socketId: socket.id,
      startTime,
    }

    // Session and profile fields were verified against the application API.
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

    // Publish immediately; chat persistence must not delay or resurrect a session.
    sessionActivity.set(sessionData.id, { session: sessionRecord, touchedAt: Date.now() })
    // Activity does not create online presence; only a verified connected sync does.

    // Save to database
    const savedMessage = await saveSystemMessageToDB(systemMessage, operationToken)
    if (savedMessage?.id) {
      systemMessage.id = savedMessage.id
    }
    sessionRecord.chatMessageId = systemMessage.id
    const onlineSession = sessions.get(sessionData.id)
    if (onlineSession) onlineSession.chatMessageId = systemMessage.id

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

    emitRoomEvent('chat-new', systemMessage, systemMessage.roomId)

    broadcastSessionSnapshots()
  })

  const syncPublishedSession = async (id: string, presenceToken?: string) => {
    const sequence = ++sessionSyncSequence
    try {
      const verified = await verifyPublishedSession(id, presenceToken)
      if (!verified || sequence !== sessionSyncSequence || endOperations.has(id)) return
      const session = verified.session
      const previous = sessions.get(id)
      // Another tab may have published a newer server version while this read
      // was in flight. Never roll pause/resume or a new session back.
      if (session && [...sessions.values()].some(existing => existing.userId === session.userId &&
          (existing.updatedAt ?? '') > (session.updatedAt ?? ''))) return
      if (!session || !['ACTIVE', 'PAUSED'].includes(session.status ?? '') || session.timeRemaining <= 0) {
        if (sessions.get(id)?.userId === verified.userId) {
          sessions.delete(id)
          broadcastSessionSnapshots()
        }
        return
      }
      const activity = sessionActivity.get(id)
      if (activity && activity.session.userId !== session.userId) {
        // A server-verified guest conversion may transfer this one session.
        activity.session = { ...activity.session, ...session }
        for (const history of chatMessagesByRoom.values()) {
          const message = history.find(item => item.id === activity.session.chatMessageId)
          if (message) {
            message.userId = session.userId
            message.username = session.username
            message.avatarUrl = session.avatarUrl
          }
        }
      }
      sessions.forEach((existing, sessionId) => {
        if (existing.userId === session.userId && sessionId !== id) sessions.delete(sessionId)
      })
      sessions.set(id, {
        ...session,
        socketId: socket.id,
        startTime: Date.now() - (session.duration * 60 - session.timeRemaining) * 1000,
        chatMessageId: activity?.session.chatMessageId ?? previous?.chatMessageId,
        lastUpdate: Date.now(),
      })
      broadcastSessionSnapshots()
    } catch {
      // A failed API lookup cannot publish client-supplied data. Later ticks,
      // focus and reconnect will revalidate the connected session.
    }
  }

  socket.on('session-sync', (payload?: { id?: string; presenceToken?: string }) => {
    if (typeof payload?.id === 'string') void syncPublishedSession(payload.id, payload.presenceToken)
  })

  socket.on('session-pause', (payload?: string | { sessionId?: string; presenceToken?: string }) => {
    const id = typeof payload === 'string' ? payload : payload?.sessionId
    if (typeof id === 'string') void syncPublishedSession(id, typeof payload === 'object' ? payload.presenceToken : undefined)
  })

  registerSessionEvent('session-end', endOperations,
    (payload: { sessionId: string; reason?: 'manual' | 'completed' | 'reset'; removeActivity?: boolean; session?: Omit<PomodoroSession, 'startTime'> & { presenceToken?: string } }) => ({
      id: payload?.sessionId,
      presenceToken: payload?.session?.presenceToken,
    }),
    (payload, session) => session ? { sessionId: session.id, session,
      reason: session.status === 'COMPLETED' ? 'completed' as const : 'manual' as const, removeActivity: payload.removeActivity === true } : null,
    async (payload, operationToken) => {
    const sessionId = payload?.sessionId
    const reason = payload?.reason ?? 'manual'
    const onlineSession = sessions.get(sessionId)
    // Presence ends immediately, even while the start message is being saved.
    sessions.delete(sessionId)
    broadcastSessionSnapshots()
    // Start persistence may still be in flight when Stop or reconnect arrives.
    await startOperations.get(sessionId)
    const activity = sessionActivity.get(sessionId)
    const snapshot = payload.session ?? onlineSession ?? activity?.session
    const session: PomodoroSession | undefined = snapshot ? {
      ...snapshot,
      chatMessageId: activity?.session.chatMessageId ?? onlineSession?.chatMessageId,
      startTime: onlineSession?.startTime ?? new Date(snapshot.startedAt).getTime(),
    } : undefined
    if (!session) return
    sessionActivity.set(sessionId, { session, touchedAt: Date.now() })

    if (session.userId && !Array.from(sessions.values()).some((active) => active.userId === session.userId)) {
      clearReactionsTargetingUser(session.userId, io)
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
      const saved = await saveSystemMessageToDB(systemMessage, operationToken)
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
      
      emitRoomEvent('chat-new', systemMessage, systemMessage.roomId)
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
      emitRoomEvent('chat-remove', session.chatMessageId, session.roomId)
      await deleteSystemMessageFromDB(session.chatMessageId, session.id)
    }

  })

  socket.on('timer-tick', (payload?: { sessionId?: string; presenceToken?: string }) => {
    if (typeof payload?.sessionId === 'string') void syncPublishedSession(payload.sessionId, payload.presenceToken)
  })

  socket.on('get-active-sessions', (payload?: { refreshAccess?: boolean }) => {
    emitSessionSnapshot(socket)
    void refreshRoomAccess(socket, payload?.refreshAccess === true)
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
    roomViewerAccess.delete(socket.id)
    const userId = socketUserMap.get(socket.id)
    if (userId) {
      socketUserMap.delete(socket.id)
      decrementUserConnection(userId)
    }

    // A disconnected timer is no longer an online session. The client restores
    // its current snapshot on reconnect, including paused sessions.
    const disconnectedSessionIds: string[] = []
    sessions.forEach((session, sessionId) => {
      if (session.socketId === socket.id) {
        const activity = sessionActivity.get(sessionId)
        if (activity) activity.touchedAt = Date.now()
        sessions.delete(sessionId)
        disconnectedSessionIds.push(sessionId)
      }
    })
    if (disconnectedSessionIds.length > 0) {
      broadcastSessionSnapshots()
      // Another connected tab may still be running the same timer.
      for (const sessionId of disconnectedSessionIds) {
        socket.broadcast.emit('session-sync-request', sessionId)
      }
    }

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
        const roomId = history[index].roomId
        history.splice(index, 1)
        chatMessagesByRoom.set(key, history)
        emitRoomEvent('chat-remove', id, roomId)
        break
      }
    }
    removedIds.push(id)
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
