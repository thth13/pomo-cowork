import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYear, differenceInDays, format } from 'date-fns'

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

    // Получаем все завершенные WORK сессии
    const allWorkSessions = await prisma.pomodoroSession.findMany({
      where: {
        userId: payload.userId,
        status: 'COMPLETED',
        type: 'WORK'
      },
      orderBy: { completedAt: 'asc' }
    })

    // 1. Всего помодоро (только work)
    const totalPomodoros = allWorkSessions.length

    // 2. Общее время фокуса (только work, в минутах)
    const totalFocusMinutes = allWorkSessions.reduce((sum, session) => sum + session.duration, 0)

    // 3. Текущая серия дней подряд
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

    // 4. Среднее время в день (считаем только дни когда были сессии)
    const sessionsByDay = new Map<string, number>()
    allWorkSessions.forEach(session => {
      const day = format(new Date(session.completedAt || session.createdAt), 'yyyy-MM-dd')
      sessionsByDay.set(day, (sessionsByDay.get(day) || 0) + session.duration)
    })
    
    const activeDaysCount = sessionsByDay.size
    const avgMinutesPerDay = activeDaysCount > 0 ? Math.round(totalFocusMinutes / activeDaysCount) : 0

    // 5. Время фокуса за текущий месяц
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const thisMonthSessions = allWorkSessions.filter(session => {
      const date = new Date(session.completedAt || session.createdAt)
      return date >= monthStart && date <= monthEnd
    })
    const focusTimeThisMonth = thisMonthSessions.reduce((sum, session) => sum + session.duration, 0)

    // Активность за неделю (последние 7 дней)
    const weeklyActivity = []
    for (let i = 6; i >= 0; i--) {
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

    // Карта активности за год (heatmap)
    const yearStart = startOfYear(now)
    const yearlyHeatmap = []
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(yearStart)
      date.setDate(date.getDate() + i)
      
      if (date > now) break
      
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)
      
      const daySessions = allWorkSessions.filter(session => {
        const sessionDate = new Date(session.completedAt || session.createdAt)
        return sessionDate >= dayStart && sessionDate <= dayEnd
      })
      
      const dayOfYear = differenceInDays(date, yearStart)
      const week = Math.floor(dayOfYear / 7)
      const dayOfWeek = date.getDay()
      
      yearlyHeatmap.push({
        week,
        dayOfWeek,
        pomodoros: daySessions.length,
        date: format(date, 'yyyy-MM-dd')
      })
    }

    // Разбивка по месяцам (текущий год)
    const monthlyBreakdown = []
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(now.getFullYear(), month, 1)
      const monthStartDate = startOfMonth(monthDate)
      const monthEndDate = endOfMonth(monthDate)
      
      if (monthStartDate > now) break
      
      const monthSessions = allWorkSessions.filter(session => {
        const sessionDate = new Date(session.completedAt || session.createdAt)
        return sessionDate >= monthStartDate && sessionDate <= monthEndDate
      })
      
      monthlyBreakdown.push({
        month: format(monthDate, 'MMM'),
        monthIndex: month,
        pomodoros: monthSessions.length
      })
    }

    const stats = {
      // Верхний блок
      totalPomodoros,
      totalFocusMinutes,
      currentStreak,
      avgMinutesPerDay,
      focusTimeThisMonth,
      
      // Активность за неделю
      weeklyActivity,
      
      // Карта активности за год
      yearlyHeatmap,
      
      // Разбивка по месяцам
      monthlyBreakdown
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
