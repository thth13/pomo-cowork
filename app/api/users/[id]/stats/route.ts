import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { startOfDay, endOfDay, subDays, startOfYear, format } from 'date-fns'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id

    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const now = new Date()

    // Получаем все завершенные WORK сессии
    const allWorkSessions = await prisma.pomodoroSession.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        type: 'WORK'
      },
      orderBy: { completedAt: 'asc' }
    })

    // 1. Текущая серия дней подряд
    let currentStreak = 0
    if (allWorkSessions.length > 0) {
      const sessionsByDay = new Map<string, boolean>()
      allWorkSessions.forEach(session => {
        const day = format(new Date(session.completedAt || session.createdAt), 'yyyy-MM-dd')
        sessionsByDay.set(day, true)
      })

      let checkDate = now
      while (true) {
        const dayKey = format(checkDate, 'yyyy-MM-dd')
        if (sessionsByDay.has(dayKey)) {
          currentStreak++
          checkDate = subDays(checkDate, 1)
        } else {
          // Если сегодня еще не работали, проверяем вчера
          if (currentStreak === 0 && format(now, 'yyyy-MM-dd') === dayKey) {
            checkDate = subDays(checkDate, 1)
          } else {
            break
          }
        }
      }
    }

    // 2. Карта активности за год (heatmap) - последние 53 недели
    const weeksAgo = 52
    let startDate = subDays(now, weeksAgo * 7)
    
    // Находим ближайшее воскресенье в прошлом
    while (startDate.getDay() !== 0) {
      startDate = subDays(startDate, 1)
    }
    
    const yearlyHeatmap = []
    let currentDate = startDate
    let weekIndex = 0
    
    while (currentDate <= now) {
      const dayStart = startOfDay(currentDate)
      const dayEnd = endOfDay(currentDate)
      
      const daySessions = allWorkSessions.filter(session => {
        const sessionDate = new Date(session.completedAt || session.createdAt)
        return sessionDate >= dayStart && sessionDate <= dayEnd
      })
      
      const dayOfWeek = currentDate.getDay()
      
      yearlyHeatmap.push({
        week: weekIndex,
        dayOfWeek,
        pomodoros: daySessions.length,
        date: format(currentDate, 'yyyy-MM-dd')
      })
      
      // Переходим к следующему дню
      currentDate = new Date(currentDate)
      currentDate.setDate(currentDate.getDate() + 1)
      
      // Если начинается новая неделя (воскресенье), увеличиваем индекс недели
      if (currentDate.getDay() === 0 && currentDate <= now) {
        weekIndex++
      }
    }

    // 3. Активность по дням недели
    const sessionsByDayOfWeek = new Map<number, number>()
    allWorkSessions.forEach(session => {
      const dayOfWeek = new Date(session.completedAt || session.createdAt).getDay()
      sessionsByDayOfWeek.set(dayOfWeek, (sessionsByDayOfWeek.get(dayOfWeek) || 0) + 1)
    })
    
    // Переупорядочиваем с понедельника
    const weeklyActivity = [
      sessionsByDayOfWeek.get(1) || 0, // Пн
      sessionsByDayOfWeek.get(2) || 0, // Вт
      sessionsByDayOfWeek.get(3) || 0, // Ср
      sessionsByDayOfWeek.get(4) || 0, // Чт
      sessionsByDayOfWeek.get(5) || 0, // Пт
      sessionsByDayOfWeek.get(6) || 0, // Сб
      sessionsByDayOfWeek.get(0) || 0, // Вс
    ]

    return NextResponse.json({
      currentStreak,
      yearlyHeatmap,
      weeklyActivity
    })

  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
