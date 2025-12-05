import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYear, differenceInDays, format, addMinutes } from 'date-fns'

export const dynamic = 'force-dynamic'

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

    // Сессии за последние 7 дней (для таймлайна)
    const sevenDaysStart = startOfDay(subDays(now, 6))
    const recentSessions = await prisma.pomodoroSession.findMany({
      where: {
        userId: payload.userId,
        startedAt: { gte: sevenDaysStart },
        status: {
          not: 'CANCELLED'
        }
      },
      orderBy: {
        startedAt: 'asc'
      }
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

    // Статистика по задачам
    const allUserTasks = await prisma.task.findMany({
      where: {
        userId: payload.userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const completedTasks = allUserTasks.filter(t => t.completed)
    const pendingTasks = allUserTasks.filter(t => !t.completed)
    
    // Группировка задач по приоритету
    const tasksByPriority = {
      critical: allUserTasks.filter(t => t.priority === 'Критичный').length,
      high: allUserTasks.filter(t => t.priority === 'Высокий').length,
      medium: allUserTasks.filter(t => t.priority === 'Средний').length,
      low: allUserTasks.filter(t => t.priority === 'Низкий').length
    }

    // Топ-5 задач по затраченным помодоро
    const topTasksByPomodoros = allUserTasks
      .sort((a, b) => b.completedPomodoros - a.completedPomodoros)
      .slice(0, 5)
      .map(task => ({
        id: task.id,
        title: task.title,
        completedPomodoros: task.completedPomodoros,
        plannedPomodoros: task.pomodoros,
        completed: task.completed,
        priority: task.priority
      }))

    // Эффективность выполнения задач (сколько задач выполнено в пределах запланированного времени)
    const tasksWithinEstimate = completedTasks.filter(t => t.completedPomodoros <= t.pomodoros).length
    const estimationAccuracy = completedTasks.length > 0 
      ? Math.round((tasksWithinEstimate / completedTasks.length) * 100)
      : 0

    // Таймлайны за последние 7 дней
    const lastSevenDaysTimeline = []
    for (let i = 6; i >= 0; i--) {
      const dayDate = subDays(now, i)
      const dayStart = startOfDay(dayDate)
      const dayEnd = endOfDay(dayDate)

      const daySessions = recentSessions.filter(session => {
        const sessionStart = session.startedAt || session.createdAt
        return sessionStart >= dayStart && sessionStart <= dayEnd
      })

      const sessionsWithTiming = daySessions.map(session => {
        const start = session.startedAt || session.createdAt
        const end = session.completedAt || session.endedAt || addMinutes(start, session.duration)

        return {
          id: session.id,
          type: session.type,
          status: session.status,
          task: session.task,
          start: start.toISOString(),
          end: end.toISOString(),
          duration: Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
        }
      }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

      const totalFocusMinutesDay = sessionsWithTiming
        .filter(s => s.type === 'WORK')
        .reduce((sum, s) => sum + s.duration, 0)

      lastSevenDaysTimeline.push({
        date: format(dayDate, 'yyyy-MM-dd'),
        dayLabel: format(dayDate, 'EEE'),
        totalFocusMinutes: totalFocusMinutesDay,
        totalPomodoros: sessionsWithTiming.filter(s => s.type === 'WORK').length,
        sessions: sessionsWithTiming
      })
    }

    const taskStats = {
      total: allUserTasks.length,
      completed: completedTasks.length,
      pending: pendingTasks.length,
      completionRate: allUserTasks.length > 0 
        ? Math.round((completedTasks.length / allUserTasks.length) * 100)
        : 0,
      byPriority: tasksByPriority,
      topByPomodoros: topTasksByPomodoros,
      estimationAccuracy,
      totalPlannedPomodoros: allUserTasks.reduce((sum, t) => sum + t.pomodoros, 0),
      totalCompletedPomodoros: allUserTasks.reduce((sum, t) => sum + t.completedPomodoros, 0)
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

      // Последние 7 дней с таймлайном
      lastSevenDaysTimeline,
      
      // Тренды продуктивности
      productivityTrends,
      
      // Статистика по задачам
      taskStats
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
