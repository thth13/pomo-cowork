import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader } from '@/lib/auth'
import { resolveExistingOrAnonymousUserId } from '@/lib/anonymousServer'
import { SessionType, SessionStatus } from '@/types'

export const dynamic = 'force-dynamic'

const SESSION_TYPES = new Set(Object.values(SessionType))

// GET /api/sessions - Get user's sessions
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'))
    const anonymousId = request.headers.get('x-anonymous-id')
    const userId = await resolveExistingOrAnonymousUserId(prisma, token, anonymousId)

    if (!userId) {
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

    if (searchParams.get('activeOnly') === '1') {
      const activeSession = await prisma.pomodoroSession.findFirst({
        where: {
          userId,
          status: { in: ['ACTIVE', 'PAUSED'] },
        },
        orderBy: { startedAt: 'desc' },
      })

      return NextResponse.json(activeSession ? [activeSession] : [])
    }

    const total = await prisma.pomodoroSession.count({
      where: { userId },
    })

    const sessions = await prisma.pomodoroSession.findMany({
      where: { userId },
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
    const { id, task, duration, type, anonymousId, startedAt, roomId } = await request.json()

    if (
      (id !== undefined && (
        typeof id !== 'string' ||
        !/^client_[a-zA-Z0-9_-]{8,100}$/.test(id)
      )) ||
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

      if (id) {
        const existingSession = await tx.pomodoroSession.findUnique({
          where: { id },
        })

        if (existingSession) {
          if (existingSession.userId !== userId) {
            throw new Error('SESSION_ID_CONFLICT')
          }

          return existingSession
        }
      }

      const activeSessions = await tx.pomodoroSession.findMany({
        where: {
          userId,
          status: { in: ['ACTIVE', 'PAUSED'] },
        },
        select: { id: true },
        orderBy: { id: 'asc' },
      })

      // Use the same per-session locks as pause/resume/complete so a late
      // update cannot resurrect a session cancelled by this new start.
      for (const activeSession of activeSessions) {
        await tx.$queryRaw`
          SELECT 1::int AS lock_acquired
          FROM pg_advisory_xact_lock(hashtext(${activeSession.id}))
        `
      }

      if (activeSessions.length > 0) {
        await tx.pomodoroSession.updateMany({
          where: {
            id: { in: activeSessions.map((activeSession) => activeSession.id) },
            userId,
            status: { in: ['ACTIVE', 'PAUSED'] },
          },
          data: {
            status: 'CANCELLED',
            endedAt: new Date()
          }
        })
      }

      return tx.pomodoroSession.create({
        data: {
          ...(id ? { id } : {}),
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
    if (error instanceof Error && error.message === 'SESSION_ID_CONFLICT') {
      return NextResponse.json(
        { error: 'Session ID conflict' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
