import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { ensureAnonymousUser } from '@/lib/anonymousServer'
import { SessionStatus } from '@/types'

export const dynamic = 'force-dynamic'

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

// DELETE /api/sessions/[id] - Cancel session
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

    const updatedSession = await prisma.pomodoroSession.update({
      where: { id: params.id },
      data: {
        status: 'CANCELLED',
        endedAt: new Date()
      }
    })

    return NextResponse.json(updatedSession)

  } catch (error) {
    console.error('Cancel session error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
