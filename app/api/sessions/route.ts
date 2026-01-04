import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { ensureAnonymousUser } from '@/lib/anonymousServer'
import { SessionType, SessionStatus } from '@/types'

export const dynamic = 'force-dynamic'

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
    const { task, duration, type, anonymousId, startedAt } = await request.json()

    if (!task || !duration || !type) {
      return NextResponse.json(
        { error: 'Task, duration and type are required' },
        { status: 400 }
      )
    }

    let userId: string

    // Check if user is authenticated
    if (token) {
      const payload = verifyToken(token)
      if (payload) {
        userId = payload.userId
      } else if (anonymousId) {
        const anonymousUser = await ensureAnonymousUser(prisma, anonymousId)
        userId = anonymousUser.id
      } else {
        return NextResponse.json(
          { error: 'Anonymous ID required for unauthenticated users' },
          { status: 400 }
        )
      }
    } else {
      // No token, use anonymous ID
      if (!anonymousId) {
        return NextResponse.json(
          { error: 'Anonymous ID required for unauthenticated users' },
          { status: 400 }
        )
      }

      const anonymousUser = await ensureAnonymousUser(prisma, anonymousId)
      userId = anonymousUser.id
    }

    // End any existing active sessions for this user (authenticated or anonymous)
    // This ensures each user has only one active session at a time
    await prisma.pomodoroSession.updateMany({
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

    const normalizedStartedAt = (() => {
      if (!startedAt) return null
      const dt = new Date(startedAt)
      if (Number.isNaN(dt.getTime())) {
        return null
      }
      return dt
    })()

    const session = await prisma.pomodoroSession.create({
      data: {
        userId,
        task,
        duration,
        type: type as string,
        status: 'ACTIVE',
        remainingSeconds: duration * 60,
        ...(normalizedStartedAt ? { startedAt: normalizedStartedAt } : {}),
      }
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
