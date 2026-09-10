import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { subDays, format } from 'date-fns'
import { buildSessionActivity } from '@/lib/sessionActivity'

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
      select: {
        type: true,
        duration: true,
        startedAt: true,
        endedAt: true,
        completedAt: true,
        pausedAt: true,
        remainingSeconds: true,
      },
      orderBy: { startedAt: 'asc' },
    })

    const activity = buildSessionActivity(allFocusSessions)
    const totalPomodoros = activity.totalPomodoros
    const totalFocusMinutes = activity.totalMinutes
    const activeDays = Array.from(activity.byDay.values()).filter(day => day.pomodoros > 0).length
    const avgPomodorosPerDay = activeDays > 0
      ? Number((totalPomodoros / activeDays).toFixed(1))
      : 0

    const focusTimeThisMonth = activity.byMonth.get(format(now, 'yyyy-MM'))?.minutes ?? 0

    // 1. Текущая серия дней подряд
    let currentStreak = 0
    if (allFocusSessions.length > 0) {
      let checkDate = now
      while (true) {
        const dayKey = format(checkDate, 'yyyy-MM-dd')
        if (activity.byDay.has(dayKey)) {
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
      const totals = activity.byDay.get(format(currentDate, 'yyyy-MM-dd'))
      
      const dayOfWeek = currentDate.getDay()
      
      yearlyHeatmap.push({
        week: weekIndex,
        dayOfWeek,
        pomodoros: totals?.pomodoros ?? 0,
        minutes: totals?.minutes ?? 0,
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
      const totals = activity.byDay.get(format(date, 'yyyy-MM-dd'))

      weeklyActivity.push({
        date: format(date, 'yyyy-MM-dd'),
        pomodoros: totals?.pomodoros ?? 0,
        minutes: totals?.minutes ?? 0
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
