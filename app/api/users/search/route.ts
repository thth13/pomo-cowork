import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    // Поиск пользователей (если query пустой, возвращаем всех)
    const whereClause = query ? {
      username: {
        contains: query,
        mode: 'insensitive' as const
      }
    } : undefined

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        sessions: {
          where: {
            status: 'COMPLETED',
            type: 'WORK'
          },
          select: {
            duration: true
          }
        }
      },
      take: 100
    })

    // Получаем всех пользователей для расчета рангов (за все время)
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        sessions: {
          where: {
            status: 'COMPLETED',
            type: 'WORK'
          },
          select: {
            duration: true
          }
        }
      }
    })

    // Вычисляем статистику и ранги за все время
    const usersWithStats = allUsers.map(user => {
      const totalMinutes = user.sessions.reduce((sum: number, s: { duration: number }) => sum + s.duration, 0)
      const totalHours = Math.round(totalMinutes / 60)
      const totalPomodoros = user.sessions.length
      
      return {
        id: user.id,
        totalHours,
        totalPomodoros,
        totalMinutes
      }
    }).sort((a, b) => b.totalMinutes - a.totalMinutes) // Сортируем по минутам для большей точности

    // Создаем мапу рангов
    const rankMap = new Map<string, number>()
    usersWithStats.forEach((user, index) => {
      rankMap.set(user.id, index + 1)
    })

    // Форматируем результаты поиска (всех пользователей, даже без активности)
    const formattedUsers = users
      .map(user => {
        const totalMinutes = user.sessions.reduce((sum, s) => sum + s.duration, 0)
        const totalHours = Math.round(totalMinutes / 60)
        const totalPomodoros = user.sessions.length
        const rank = rankMap.get(user.id) || 999

        return {
          id: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt.toISOString(),
          isOnline: false, // TODO: интеграция с socket для реального статуса
          rank,
          stats: {
            totalHours,
            totalPomodoros
          }
        }
      })
      .sort((a, b) => a.rank - b.rank)

    return NextResponse.json({ users: formattedUsers })

  } catch (error) {
    console.error('Error searching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
