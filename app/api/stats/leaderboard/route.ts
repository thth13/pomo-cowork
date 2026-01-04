import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { getEffectiveMinutes, getSessionAttributionDate } from '@/lib/sessionStats'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Получаем текущего пользователя если авторизован
    const authHeader = request.headers.get('authorization')
    const token = authHeader ? getTokenFromHeader(authHeader) : null
    let currentUserId: string | null = null

    if (token) {
      const payload = verifyToken(token)
      if (payload) {
        currentUserId = payload.userId
      }
    }

    // Дата 7 дней назад
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    // Получаем всех пользователей с их фокус-сессиями за последнюю неделю
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        sessions: {
          where: {
            status: { in: ['COMPLETED', 'CANCELLED'] },
            type: { in: ['WORK', 'TIME_TRACKING'] },
            OR: [
              { completedAt: { gte: weekAgo } },
              { endedAt: { gte: weekAgo } },
            ],
          },
          select: {
            startedAt: true,
            endedAt: true,
            completedAt: true,
            duration: true,
            remainingSeconds: true,
            pausedAt: true,
            type: true,
          }
        }
      }
    })

    // Вычисляем статистику для каждого пользователя за последнюю неделю (включая с нулевой активностью)
    const usersWithStats = users.map(user => {
      const totalMinutes = user.sessions.reduce((sum, session) => sum + getEffectiveMinutes(session), 0)
      const totalHours = Math.round(totalMinutes / 60)
      const totalPomodoros = user.sessions.filter((session) => session.type === 'WORK').length
      
      return {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        totalHours,
        totalPomodoros,
        totalMinutes
      }
    })

    const weekTotals = usersWithStats.reduce(
      (acc, user) => {
        acc.totalMinutes += user.totalMinutes
        acc.totalPomodoros += user.totalPomodoros
        return acc
      },
      { totalMinutes: 0, totalPomodoros: 0 }
    )

    // Сортируем по минутам для точности (пользователи без активности будут внизу)
    const sortedUsers = usersWithStats.sort((a, b) => b.totalMinutes - a.totalMinutes)

    // Добавляем ранги
    const leaderboard = sortedUsers.map((user, index) => ({
      ...user,
      rank: index + 1
    }))

    // Топ 10 пользователей
    const topUsers = leaderboard.slice(0, 10)

    // Находим текущего пользователя
    let currentUser = null
    if (currentUserId) {
      currentUser = leaderboard.find(u => u.id === currentUserId) || null
    }

    return NextResponse.json({
      topUsers,
      currentUser,
      totalUsers: leaderboard.length,
      weekTotals: {
        ...weekTotals,
        totalHours: Math.round(weekTotals.totalMinutes / 60),
      },
    })

  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
