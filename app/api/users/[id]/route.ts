import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { getEffectiveMinutes } from '@/lib/sessionStats'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id

    // Get user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        description: true,
        createdAt: true,
        _count: {
          select: {
            sessions: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user statistics (focus time includes WORK + TIME_TRACKING, including manual stops)
    const focusSessions = await prisma.pomodoroSession.findMany({
      where: {
        userId,
        status: { in: ['COMPLETED', 'CANCELLED'] },
        type: { in: ['WORK', 'TIME_TRACKING'] },
      },
      select: {
        startedAt: true,
        endedAt: true,
        completedAt: true,
        duration: true,
      },
    })

    const totalFocusMinutes = focusSessions.reduce((sum, session) => sum + getEffectiveMinutes(session), 0)

    const totalSessions = await prisma.pomodoroSession.count({
      where: { userId },
    })

    // Get completed sessions count
    const completedSessions = await prisma.pomodoroSession.count({
      where: {
        userId,
        status: 'COMPLETED'
      }
    })

    // Get current active session
    const activeSession = await prisma.pomodoroSession.findFirst({
      where: {
        userId,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        task: true,
        type: true,
        startedAt: true,
        duration: true
      }
    })

    // Get recent sessions (last 7 days)
    const recentSessions = await prisma.pomodoroSession.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      select: {
        id: true,
        task: true,
        type: true,
        status: true,
        duration: true,
        createdAt: true,
        completedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    // Calculate total focus time in hours
    const totalWorkHours = Math.round((totalFocusMinutes / 60) * 10) / 10

    // Calculate completion rate
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        description: user.description,
        createdAt: user.createdAt,
        totalSessions: user._count.sessions
      },
      stats: {
        totalSessions,
        completedSessions,
        totalWorkHours,
        completionRate
      },
      activeSession,
      recentSessions
    })

  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
