import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Получаем параметры запроса
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')

    // Получаем начало и конец сегодняшнего дня
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Получаем все завершенные сессии за сегодня
    const sessions = await prisma.pomodoroSession.findMany({
      where: {
        status: {
          in: ['COMPLETED', 'CANCELLED']
        },
        startedAt: {
          gte: today,
          lt: tomorrow
        },
        // Фильтр по комнате: если roomId передан, фильтруем по нему, иначе только null (глобальные сессии)
        roomId: roomId || null
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
      orderBy: {
        startedAt: 'desc'
      }
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching today sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}
