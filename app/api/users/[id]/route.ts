import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

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

    // Get user statistics
    const stats = await prisma.pomodoroSession.aggregate({
      where: { userId },
      _sum: {
        duration: true
      },
      _count: {
        id: true
      }
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

    // Calculate total work time in hours
    const totalWorkMinutes = stats._sum.duration || 0
    const totalWorkHours = Math.round((totalWorkMinutes / 60) * 10) / 10

    // Calculate completion rate
    const totalSessions = stats._count.id || 0
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
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
