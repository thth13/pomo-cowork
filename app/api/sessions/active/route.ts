import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

type ActiveSession = Prisma.PomodoroSessionGetPayload<{
  include: {
    user: {
      select: {
        id: true
        username: true
      }
    }
  }
}>

interface SessionWithTimeRemaining {
  id: ActiveSession['id']
  userId: ActiveSession['userId']
  username: ActiveSession['user']['username']
  task: ActiveSession['task']
  type: ActiveSession['type']
  timeRemaining: number
  startedAt: ActiveSession['startedAt']
}

// GET /api/sessions/active - Get all active sessions
export async function GET(request: NextRequest) {
  try {
    const activeSessions = await prisma.pomodoroSession.findMany({
      where: {
        status: 'ACTIVE',
        startedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    })

    const sessionsWithTimeRemaining = activeSessions.map<SessionWithTimeRemaining>((session) => {
      const startTime = new Date(session.startedAt).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000) // seconds
      const totalDuration = session.duration * 60 // convert to seconds
      const timeRemaining = Math.max(0, totalDuration - elapsed)

      return {
        id: session.id,
        userId: session.userId,
        username: session.user.username,
        task: session.task,
        type: session.type,
        timeRemaining,
        startedAt: session.startedAt
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
