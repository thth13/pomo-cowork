import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import ActiveSessions from '@/components/ActiveSessions'

export const dynamic = 'force-dynamic'

type ActiveSession = Prisma.PomodoroSessionGetPayload<{
  include: {
    user: {
      select: {
        id: true
        username: true
        avatarUrl: true
      }
    }
  }
}>

interface SessionWithTimeRemaining {
  id: ActiveSession['id']
  userId: ActiveSession['userId']
  username: ActiveSession['user']['username']
  roomId: ActiveSession['roomId']
  task: ActiveSession['task']
  type: ActiveSession['type']
  duration: number
  timeRemaining: number
  startedAt: ActiveSession['startedAt']
  status: ActiveSession['status']
  avatarUrl?: ActiveSession['user']['avatarUrl']
}

// GET /api/sessions/active - Get all active sessions
export async function GET(request: NextRequest) {
  try {
    // Clean up old paused sessions (older than 30 minutes)
    const PAUSED_TIMEOUT = 30 * 60 * 1000 // 30 minutes in milliseconds
    const cutoffTime = new Date(Date.now() - PAUSED_TIMEOUT)
    
    await prisma.pomodoroSession.deleteMany({
      where: {
        status: 'PAUSED',
        pausedAt: {
          lt: cutoffTime
        }
      }
    })

    const activeSessions = await prisma.pomodoroSession.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'PAUSED']
        },
        startedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    })

    const sessionsWithTimeRemaining = activeSessions.map<SessionWithTimeRemaining>((session) => {
      let timeRemaining: number
      if (session.status === 'PAUSED' && typeof session.remainingSeconds === 'number') {
        timeRemaining = Math.max(0, session.remainingSeconds)
      } else {
        const startTime = new Date(session.startedAt).getTime()
        const now = Date.now()
        const elapsed = Math.floor((now - startTime) / 1000) // seconds
        const totalDuration = session.duration * 60 // convert to seconds
        timeRemaining = Math.max(0, totalDuration - elapsed)
      }

      return {
        id: session.id,
        userId: session.userId,
        username: session.user.username,
        avatarUrl: session.user.avatarUrl,
        roomId: session.roomId,
        task: session.task,
        type: session.type,
        duration: session.duration,
        timeRemaining,
        startedAt: session.startedAt,
        status: session.status as ActiveSession['status'],
      }
    }).filter((session: SessionWithTimeRemaining) => session.timeRemaining > 0) // Only return sessions with time left

    return NextResponse.json(sessionsWithTimeRemaining)

  } catch (error) {
    console.error('Get active sessions error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
