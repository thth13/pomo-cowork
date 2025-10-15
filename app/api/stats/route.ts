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

    // Получаем период из query параметров
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '7' // 7, 30, 365

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

    // Активность за выбранный период
    const daysCount = parseInt(period)
    const weeklyActivity = []
    
    if (daysCount === 365) {
      // Для года - разбивка по месяцам за последние 12 месяцев
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStartDate = startOfMonth(monthDate)
        const monthEndDate = endOfMonth(monthDate)
        
        const monthSessions = allWorkSessions.filter(session => {
          const sessionDate = new Date(session.completedAt || session.createdAt)
          return sessionDate >= monthStartDate && sessionDate <= monthEndDate
        })
        
        weeklyActivity.push({
          date: format(monthDate, 'yyyy-MM'),
          pomodoros: monthSessions.length
        })
      }
    } else {
      // Для 7 и 30 дней - разбивка по дням
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
    }

    // Карта активности за год (heatmap) - последние 53 недели
    const yearlyHeatmap = []
    
    // Начинаем с воскресенья 53 недели назад
    const weeksAgo = 52
    let startDate = subDays(now, weeksAgo * 7)
    
    // Находим ближайшее воскресенье в прошлом
    while (startDate.getDay() !== 0) {
      startDate = subDays(startDate, 1)
    }
    
    // Генерируем данные для каждого дня
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

    // Разбивка по месяцам (последние 12 месяцев)
    const monthlyBreakdown = []
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStartDate = startOfMonth(monthDate)
      const monthEndDate = endOfMonth(monthDate)
      
      const monthSessions = allWorkSessions.filter(session => {
        const sessionDate = new Date(session.completedAt || session.createdAt)
        return sessionDate >= monthStartDate && sessionDate <= monthEndDate
      })
      
      monthlyBreakdown.push({
        month: format(monthDate, 'MMM'),
        monthIndex: monthDate.getMonth(),
        pomodoros: monthSessions.length
      })
    }

    // Тренды продуктивности
    // 1. Лучшее время дня (по часам)
    const sessionsByHour = new Map<number, number>()
    allWorkSessions.forEach(session => {
      const hour = new Date(session.completedAt || session.createdAt).getHours()
      sessionsByHour.set(hour, (sessionsByHour.get(hour) || 0) + 1)
    })
    
    let bestHour = 0
    let maxSessions = 0
    sessionsByHour.forEach((count, hour) => {
      if (count > maxSessions) {
        maxSessions = count
        bestHour = hour
      }
    })
    
    const bestTimeStart = `${bestHour.toString().padStart(2, '0')}:00`
    const bestTimeEnd = `${(bestHour + 2).toString().padStart(2, '0')}:00`
    const bestTimeEfficiency = allWorkSessions.length > 0 
      ? Math.round((maxSessions / allWorkSessions.length) * 100) 
      : 0

    // 2. Лучший день недели
    const sessionsByDayOfWeek = new Map<number, number>()
    allWorkSessions.forEach(session => {
      const dayOfWeek = new Date(session.completedAt || session.createdAt).getDay()
      sessionsByDayOfWeek.set(dayOfWeek, (sessionsByDayOfWeek.get(dayOfWeek) || 0) + 1)
    })
    
    let bestDayOfWeek = 0
    let maxDaySessions = 0
    sessionsByDayOfWeek.forEach((count, day) => {
      if (count > maxDaySessions) {
        maxDaySessions = count
        bestDayOfWeek = day
      }
    })
    
    const daysNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
    const bestDayName = daysNames[bestDayOfWeek]
    
    // Считаем количество уникальных дней для этого дня недели
    const uniqueDaysOfWeek = new Set<string>()
    allWorkSessions.forEach(session => {
      const date = new Date(session.completedAt || session.createdAt)
      if (date.getDay() === bestDayOfWeek) {
        uniqueDaysOfWeek.add(format(date, 'yyyy-MM-dd'))
      }
    })
    const avgPomodorosPerBestDay = uniqueDaysOfWeek.size > 0 
      ? (maxDaySessions / uniqueDaysOfWeek.size).toFixed(1) 
      : '0'

    // 3. Средняя длительность фокус-режима
    const avgSessionDuration = allWorkSessions.length > 0 
      ? Math.round(allWorkSessions.reduce((sum, s) => sum + s.duration, 0) / allWorkSessions.length) 
      : 0

    // 4. Завершенные задачи за эту неделю
    const weekStart = subDays(now, 6)
    const weekTasks = await prisma.task.findMany({
      where: {
        userId: payload.userId,
        completed: true,
        updatedAt: {
          gte: weekStart
        }
      }
    })
    
    const allTasks = await prisma.task.findMany({
      where: {
        userId: payload.userId,
        createdAt: {
          gte: weekStart
        }
      }
    })

    const productivityTrends = {
      bestTime: {
        start: bestTimeStart,
        end: bestTimeEnd,
        efficiency: bestTimeEfficiency
      },
      bestDay: {
        name: bestDayName,
        avgPomodoros: avgPomodorosPerBestDay
      },
      avgSessionDuration,
      weeklyTasks: {
        completed: weekTasks.length,
        total: allTasks.length
      }
    }

    const stats = {
      // Верхний блок
      totalPomodoros,
      totalFocusMinutes,
      currentStreak,
      avgMinutesPerDay,
      focusTimeThisMonth,
      
      // Активность за выбранный период
      weeklyActivity,
      
      // Карта активности за год
      yearlyHeatmap,
      
      // Разбивка по месяцам (последние 12 месяцев)
      monthlyBreakdown,
      
      // Тренды продуктивности
      productivityTrends
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
