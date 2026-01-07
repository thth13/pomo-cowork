import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { ensureAnonymousUser } from '@/lib/anonymousServer'
import { SessionStatus } from '@/types'

export const dynamic = 'force-dynamic'

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

    let userId: string | null = null
    
    // Check if user is authenticated
    if (token) {
      const payload = verifyToken(token)
      if (payload) {
        userId = payload.userId
      }
    }

    let effectiveUserId = userId
    if (!effectiveUserId && anonymousId) {
      const anonymousUser = await ensureAnonymousUser(prisma, anonymousId)
      effectiveUserId = anonymousUser.id
    }

    if (!effectiveUserId) {
      return NextResponse.json(
        { error: 'Authentication or anonymous ID required' },
        { status: 401 }
      )
    }

    const session = await prisma.pomodoroSession.findFirst({
      where: {
        id: params.id,
        userId: effectiveUserId
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, any> = {}

    if (typeof status === 'string') {
      updateData.status = status
    }

    if (endedAt !== undefined) {
      updateData.endedAt = endedAt ? new Date(endedAt) : null
    }

    if (completedAt !== undefined) {
      updateData.completedAt = completedAt ? new Date(completedAt) : null
    }

    if (pausedAt !== undefined) {
      updateData.pausedAt = pausedAt ? new Date(pausedAt) : null
    }

    if (timeRemaining !== undefined) {
      updateData.remainingSeconds = timeRemaining
    }

    if (startedAt !== undefined) {
      updateData.startedAt = new Date(startedAt)
    }

    if (typeof task === 'string') {
      updateData.task = task
    }

    if (typeof duration === 'number') {
      updateData.duration = duration
    }

    if (typeof type === 'string') {
      updateData.type = type
    }

    const updatedSession = await prisma.pomodoroSession.update({
      where: { id: params.id },
      data: updateData,
    })

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
