import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { ensureAnonymousUser } from '@/lib/anonymousServer'
import { SessionType, SessionStatus } from '@/types'

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

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const sessions = await prisma.pomodoroSession.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json(sessions)

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
    const { task, duration, type, anonymousId } = await request.json()

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

        // End any existing active sessions for authenticated user
        await prisma.pomodoroSession.updateMany({
          where: {
            userId: payload.userId,
            status: {
              in: ['ACTIVE', 'PAUSED']
            }
          },
          data: {
            status: 'CANCELLED',
            endedAt: new Date()
          }
        })
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

    const session = await prisma.pomodoroSession.create({
      data: {
        userId,
        task,
        duration,
        type: type as string,
        status: 'ACTIVE'
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
