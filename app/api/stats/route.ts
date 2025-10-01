import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { SessionStatus } from '@/types'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'

// GET /api/stats - Get user statistics
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

    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)

    // Get all completed sessions
    const allSessions = await prisma.pomodoroSession.findMany({
      where: {
        userId: payload.userId,
        status: 'COMPLETED'
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate total stats
    const totalSessions = allSessions.length
    const totalMinutes = allSessions.reduce((sum, session) => sum + session.duration, 0)

    // Calculate today's stats
    const todaysSessions = allSessions.filter(session => {
      const sessionDate = new Date(session.createdAt)
      return sessionDate >= todayStart && sessionDate <= todayEnd
    })
    const todaysSessionsCount = todaysSessions.length
    const todaysMinutes = todaysSessions.reduce((sum, session) => sum + session.duration, 0)

    // Calculate weekly stats (last 7 days)
    const weeklyStats = []
    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i)
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)
      
      const daySessions = allSessions.filter(session => {
        const sessionDate = new Date(session.createdAt)
        return sessionDate >= dayStart && sessionDate <= dayEnd
      })
      
      weeklyStats.push({
        date: format(date, 'yyyy-MM-dd'),
        sessions: daySessions.length,
        minutes: daySessions.reduce((sum, session) => sum + session.duration, 0)
      })
    }

    // Calculate monthly stats (last 30 days)
    const monthlyStats = []
    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i)
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)
      
      const daySessions = allSessions.filter(session => {
        const sessionDate = new Date(session.createdAt)
        return sessionDate >= dayStart && sessionDate <= dayEnd
      })
      
      monthlyStats.push({
        date: format(date, 'yyyy-MM-dd'),
        sessions: daySessions.length,
        minutes: daySessions.reduce((sum, session) => sum + session.duration, 0)
      })
    }

    const stats = {
      totalSessions,
      totalMinutes,
      todaysSessions: todaysSessionsCount,
      todaysMinutes,
      weeklyStats,
      monthlyStats
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
