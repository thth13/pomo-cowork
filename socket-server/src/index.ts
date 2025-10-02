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
const onlineUsers = new Set<string>()

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

io.on('connection', (socket) => {
  socket.on('join-user', (userId: string) => {
    socket.join(`user-${userId}`)
    onlineUsers.add(userId)
    io.emit('user-online', { userId, online: true })
  })

  socket.on('session-start', (sessionData: PomodoroSession) => {
    sessions.set(sessionData.id, {
      ...sessionData,
      socketId: socket.id,
      startTime: Date.now()
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
    sessions.delete(sessionId)
    io.emit('session-update', serializeSessions())
  })

  socket.on('timer-tick', (payload: { sessionId: string; timeRemaining: number }) => {
    const session = sessions.get(payload.sessionId)
    if (!session) {
      return
    }

    session.timeRemaining = payload.timeRemaining
    session.lastUpdate = Date.now()

    if (payload.timeRemaining % 30 === 0) {
      io.emit('session-update', serializeSessions())
    }
  })

  socket.on('get-active-sessions', () => {
    socket.emit('session-update', serializeSessions())
  })

  socket.on('disconnect', () => {
    sessions.forEach((session) => {
      if (session.socketId === socket.id) {
        onlineUsers.delete(session.userId)
        io.emit('user-online', { userId: session.userId, online: false })
      }
    })
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

