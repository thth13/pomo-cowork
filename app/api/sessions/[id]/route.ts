import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { resolveExistingOrAnonymousUserId } from '@/lib/anonymousServer'
import { SessionStatus, SessionType } from '@/types'

export const dynamic = 'force-dynamic'

const SESSION_TYPES = new Set(Object.values(SessionType))
const SESSION_STATUSES = new Set(Object.values(SessionStatus))

const getSocketServerUrl = () =>
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  'http://localhost:4000'

const notifyChatRemoval = async (messageIds: string[]) => {
  if (!messageIds.length) return

  try {
    const endpoint = new URL('/chat/remove', getSocketServerUrl())
    await fetch(endpoint.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: messageIds })
    })
  } catch (error) {
    console.error('Failed to notify chat removal', error)
  }
}

// PUT /api/sessions/[id] - Update session (supports anonymous users)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)
    const {
      status,
      endedAt,
      completedAt,
      anonymousId,
      pausedAt,
      timeRemaining,
      startedAt,
      task,
      duration,
      type,
    } = await request.json()

    const effectiveUserId = await resolveExistingOrAnonymousUserId(
      prisma,
      token,
      anonymousId
    )

    if (!effectiveUserId) {
      return NextResponse.json(
        { error: 'Authentication or anonymous ID required' },
        { status: 401 }
      )
    }

    const updateData: Record<string, any> = {}

    if (status !== undefined && !SESSION_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (status !== undefined) {
      updateData.status = status
    }

    if (endedAt !== undefined) {
      const date = endedAt ? new Date(endedAt) : null
      if (date && Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid endedAt' }, { status: 400 })
      }
      updateData.endedAt = date
    }

    if (completedAt !== undefined) {
      const date = completedAt ? new Date(completedAt) : null
      if (date && Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid completedAt' }, { status: 400 })
      }
      updateData.completedAt = date
    }

    if (pausedAt !== undefined) {
      const date = pausedAt ? new Date(pausedAt) : null
      if (date && Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid pausedAt' }, { status: 400 })
      }
      updateData.pausedAt = date
    }

    if (timeRemaining !== undefined) {
      if (!Number.isInteger(timeRemaining) || timeRemaining < 0) {
        return NextResponse.json({ error: 'Invalid timeRemaining' }, { status: 400 })
      }
      updateData.remainingSeconds = timeRemaining
    }

    if (startedAt !== undefined) {
      const date = new Date(startedAt)
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid startedAt' }, { status: 400 })
      }
      updateData.startedAt = date
    }

    if (task !== undefined) {
      if (typeof task !== 'string' || !task.trim()) {
        return NextResponse.json({ error: 'Invalid task' }, { status: 400 })
      }
      updateData.task = task.trim()
    }

    if (duration !== undefined) {
      if (!Number.isInteger(duration) || duration < 0) {
        return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })
      }
      updateData.duration = duration
    }

    if (type !== undefined) {
      if (!SESSION_TYPES.has(type)) {
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
      }
      updateData.type = type
    }

    const result = await prisma.pomodoroSession.updateMany({
      where: {
        id: params.id,
        userId: effectiveUserId,
      },
      data: updateData,
    })

    if (result.count === 0) {
      const isTerminalUpdate =
        status === SessionStatus.CANCELLED ||
        status === SessionStatus.COMPLETED

      if (isTerminalUpdate) {
        return NextResponse.json({
          id: params.id,
          status,
          alreadyRemoved: true,
        })
      }

      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const updatedSession = await prisma.pomodoroSession.findUnique({
      where: { id: params.id },
    })

    if (!updatedSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(updatedSession)

  } catch (error) {
    console.error('Update session error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/sessions/[id] - Delete session and related chat message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const session = await prisma.pomodoroSession.findFirst({
      where: {
        id: params.id,
        userId: payload.userId
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Delete related chat messages (work_start and session_complete messages for this session)
    // We'll delete messages that match the session's task and were created around the same time
    const sessionStart = new Date(session.startedAt)
    const timeBuffer = 10000 // 10 seconds buffer
    const startTimeMin = new Date(sessionStart.getTime() - timeBuffer)
    const startTimeMax = new Date(sessionStart.getTime() + timeBuffer)

    const chatWhere = {
      where: {
        userId: payload.userId,
        roomId: session.roomId ?? null,
        actionTask: session.task,
        actionType: { in: ['work_start', 'session_complete', 'time_tracking_start'] },
        createdAt: {
          gte: startTimeMin,
          lte: session.completedAt 
            ? new Date(new Date(session.completedAt).getTime() + timeBuffer)
            : startTimeMax
        }
      }
    }

    const messagesToDelete = await prisma.chatMessage.findMany({
      ...chatWhere,
      select: { id: true }
    })

    await prisma.chatMessage.deleteMany(chatWhere)

    // Delete the session
    await prisma.pomodoroSession.delete({
      where: { id: params.id }
    })

    const removedMessageIds = messagesToDelete.map((m) => m.id)
    await notifyChatRemoval(removedMessageIds)

    return NextResponse.json({ success: true, removedMessageIds })

  } catch (error) {
    console.error('Delete session error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
