import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { startOfDay, endOfDay, subDays, format, startOfMonth, endOfMonth } from 'date-fns'
import { getEffectiveMinutes, getSessionAttributionDate } from '@/lib/sessionStats'

export const dynamic = 'force-dynamic'

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

    // Вся фокус-активность пользователя: WORK + TIME_TRACKING (включая ручные остановки)
    const allFocusSessions = await prisma.pomodoroSession.findMany({
      where: {
        userId,
        status: { in: ['COMPLETED', 'CANCELLED'] },
        type: { in: ['WORK', 'TIME_TRACKING'] },
      },
      orderBy: { startedAt: 'asc' },
    })

    const allWorkSessions = allFocusSessions.filter((session) => session.type === 'WORK')

    const totalPomodoros = allWorkSessions.length
    const totalFocusMinutes = allFocusSessions.reduce((sum, session) => sum + getEffectiveMinutes(session), 0)

    const sessionsCountByDay = new Map<string, number>()
    allWorkSessions.forEach(session => {
      const day = format(getSessionAttributionDate(session), 'yyyy-MM-dd')
      sessionsCountByDay.set(day, (sessionsCountByDay.get(day) || 0) + 1)
    })

    const activeDays = sessionsCountByDay.size
    const avgPomodorosPerDay = activeDays > 0
      ? Number((totalPomodoros / activeDays).toFixed(1))
      : 0

    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const focusTimeThisMonth = allFocusSessions.reduce((sum, session) => {
      const date = getSessionAttributionDate(session)
      if (date >= monthStart && date <= monthEnd) {
        return sum + getEffectiveMinutes(session)
      }
      return sum
    }, 0)

    // 1. Текущая серия дней подряд
    let currentStreak = 0
    if (allFocusSessions.length > 0) {
      const sessionsByDay = new Map<string, boolean>()
      allFocusSessions.forEach(session => {
        const day = format(getSessionAttributionDate(session), 'yyyy-MM-dd')
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
        const sessionDate = getSessionAttributionDate(session)
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

    // 3. Активность за последние 7 дней
    const daysCount = 7
    const weeklyActivity = []
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = subDays(now, i)
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)

      const daySessions = allWorkSessions.filter(session => {
        const sessionDate = new Date(session.completedAt || session.createdAt)
        return sessionDate >= dayStart && sessionDate <= dayEnd
      })

      weeklyActivity.push({
        date: format(date, 'yyyy-MM-dd'),
        pomodoros: daySessions.length
      })
    }

    return NextResponse.json({
      totalPomodoros,
      totalFocusMinutes,
      avgPomodorosPerDay,
      activeDays,
      focusTimeThisMonth,
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
