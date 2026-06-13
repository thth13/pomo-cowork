import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { resolveExistingOrAnonymousUserId } from '@/lib/anonymousServer'
import { SessionType, SessionStatus } from '@/types'

export const dynamic = 'force-dynamic'

const SESSION_TYPES = new Set(Object.values(SessionType))

// GET /api/sessions - Get user's sessions
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const limitParam = parseInt(searchParams.get('limit') || '50', 10)
    const limit = Math.min(Math.max(limitParam, 1), 100)
    const skip = (page - 1) * limit

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const total = await prisma.pomodoroSession.count({
      where: { userId: payload.userId },
    })

    const sessions = await prisma.pomodoroSession.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    return NextResponse.json(sessions, {
      headers: {
        'X-Total-Count': total.toString(),
        'X-Page': page.toString(),
        'X-Limit': limit.toString(),
      }
    })

  } catch (error) {
    console.error('Get sessions error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}

// POST /api/sessions - Create new session (supports anonymous users)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)
    const { task, duration, type, anonymousId, startedAt, roomId } = await request.json()

    if (
      typeof task !== 'string' ||
      !task.trim() ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      !SESSION_TYPES.has(type)
    ) {
      return NextResponse.json(
        { error: 'Invalid task, duration or type' },
        { status: 400 }
      )
    }

    const userId = await resolveExistingOrAnonymousUserId(
      prisma,
      token,
      anonymousId,
      { createAnonymous: true }
    )
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication or anonymous ID required' },
        { status: 401 }
      )
    }

    const normalizedStartedAt = (() => {
      if (startedAt === undefined) return undefined
      if (typeof startedAt !== 'string') return null
      const dt = new Date(startedAt)
      if (Number.isNaN(dt.getTime())) {
        return null
      }
      return dt
    })()

    if (normalizedStartedAt === null) {
      return NextResponse.json({ error: 'Invalid startedAt' }, { status: 400 })
    }

    const normalizedRoomId = (() => {
      if (typeof roomId !== 'string') return null
      const trimmed = roomId.trim()
      return trimmed ? trimmed : null
    })()

    if (normalizedRoomId) {
      const room = await prisma.room.findUnique({
        where: { id: normalizedRoomId },
        select: { id: true, privacy: true, ownerId: true },
      })

      if (!room) {
        return NextResponse.json({ error: 'Invalid room' }, { status: 400 })
      }

      if (room.privacy === 'PRIVATE') {
        if (userId !== room.ownerId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    const session = await prisma.$transaction(async (tx) => {
      // Serialize session creation per user, including concurrent browser tabs.
      await tx.$queryRaw`
        SELECT 1::int AS lock_acquired
        FROM pg_advisory_xact_lock(hashtext(${userId}))
      `

      await tx.pomodoroSession.updateMany({
        where: {
          userId,
          status: {
            in: ['ACTIVE', 'PAUSED']
          }
        },
        data: {
          status: 'CANCELLED',
          endedAt: new Date()
        }
      })

      return tx.pomodoroSession.create({
        data: {
          userId,
          ...(normalizedRoomId ? { roomId: normalizedRoomId } : {}),
          task: task.trim(),
          duration,
          type: type as string,
          status: 'ACTIVE',
          remainingSeconds: duration * 60,
          ...(normalizedStartedAt ? { startedAt: normalizedStartedAt } : {}),
        }
      })
    })

    return NextResponse.json(session)

  } catch (error) {
    console.error('Create session error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
