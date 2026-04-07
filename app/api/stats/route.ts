import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYear, startOfWeek, endOfWeek, differenceInDays, format, addMinutes, subMonths, subYears, subWeeks } from 'date-fns'
import { getEffectiveMinutes, getSessionAttributionDate } from '@/lib/sessionStats'

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
    const requestedHeatmapRange = searchParams.get('heatmapRange') || 'rolling'
    const activityOffset = Math.max(
      0,
      parseInt(searchParams.get('activityOffset') || '0', 10) || 0
    )
    const timelineOffset = Math.max(
      0,
      parseInt(searchParams.get('timelineOffset') || '0', 10) || 0
    )

    const now = new Date()
    const timelineStart = startOfDay(subDays(now, 6 + timelineOffset))
    const timelineEnd = endOfDay(subDays(now, timelineOffset))

    // Вся фокус-активность пользователя: WORK + TIME_TRACKING (включая ручные остановки)
    const allFocusSessions = await prisma.pomodoroSession.findMany({
      where: {
        userId: payload.userId,
        status: { in: ['COMPLETED', 'CANCELLED'] },
        type: { in: ['WORK', 'TIME_TRACKING'] },
      },
      select: {
        id: true,
        task: true,
        type: true,
        status: true,
        duration: true,
        startedAt: true,
        endedAt: true,
        completedAt: true,
        pausedAt: true,
        remainingSeconds: true,
        createdAt: true,
      },
      orderBy: { startedAt: 'asc' },
    })

    const allWorkSessions = allFocusSessions.filter((session) => session.type === 'WORK')
    const availableHeatmapYears = Array.from(
      new Set([
        now.getFullYear(),
        ...allWorkSessions.map((session) => getSessionAttributionDate(session).getFullYear())
      ])
    ).sort((a, b) => b - a)
    const requestedHeatmapYear = /^\d{4}$/.test(requestedHeatmapRange)
      ? parseInt(requestedHeatmapRange, 10)
      : null
    const selectedHeatmapRange = requestedHeatmapYear && availableHeatmapYears.includes(requestedHeatmapYear)
      ? requestedHeatmapRange
      : 'rolling'

    // Сессии за последние 7 дней (для таймлайна)
    const sevenDaysStart = timelineStart
    const recentSessions = await prisma.pomodoroSession.findMany({
      where: {
        userId: payload.userId,
        startedAt: { gte: sevenDaysStart, lte: timelineEnd },
        status: { in: ['COMPLETED', 'CANCELLED'] },
      },
      select: {
        id: true,
        task: true,
        type: true,
        status: true,
        duration: true,
        startedAt: true,
        endedAt: true,
        completedAt: true,
        pausedAt: true,
        remainingSeconds: true,
        createdAt: true,
      },
      orderBy: {
        startedAt: 'asc'
      }
    })

    // 1. Всего помодоро (work, включая ручные остановки)
    const totalPomodoros = allWorkSessions.length

    // 2. Общее время фокуса (work + time tracking, учитывая ручные остановки)
    const totalFocusMinutes = allFocusSessions.reduce((sum, session) => sum + getEffectiveMinutes(session), 0)

    // 3. Текущая серия дней подряд
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

    // 4. Среднее время в день (считаем только дни когда были сессии)
    const sessionsByDay = new Map<string, number>()
    allFocusSessions.forEach(session => {
      const day = format(getSessionAttributionDate(session), 'yyyy-MM-dd')
      sessionsByDay.set(day, (sessionsByDay.get(day) || 0) + getEffectiveMinutes(session))
    })
    
    const activeDaysCount = sessionsByDay.size
    const avgMinutesPerDay = activeDaysCount > 0 ? Math.round(totalFocusMinutes / activeDaysCount) : 0

    // 5. Время фокуса за текущий месяц
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const thisMonthSessions = allFocusSessions.filter(session => {
      const date = getSessionAttributionDate(session)
      return date >= monthStart && date <= monthEnd
    })
    const focusTimeThisMonth = thisMonthSessions.reduce((sum, session) => sum + getEffectiveMinutes(session), 0)

    // Активность за выбранный период с поддержкой смещения
    const daysCount = parseInt(period)
    const weeklyActivity = []
    let activityRangeStart = ''
    let activityRangeEnd = ''
    
    if (daysCount === 365) {
      // Для года - разбивка по месяцам
      const baseYear = subYears(now, activityOffset)
      const yearStart = startOfYear(baseYear)
      const yearEnd = activityOffset === 0 ? now : endOfDay(new Date(baseYear.getFullYear(), 11, 31))
      activityRangeStart = format(yearStart, 'yyyy-MM-dd')
      activityRangeEnd = format(yearEnd, 'yyyy-MM-dd')
      
      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(baseYear.getFullYear(), i, 1)
        const monthStartDate = startOfMonth(monthDate)
        const monthEndDate = endOfMonth(monthDate)
        
        const monthSessions = allWorkSessions.filter(session => {
          const sessionDate = getSessionAttributionDate(session)
          return sessionDate >= monthStartDate && sessionDate <= monthEndDate
        })
        
        weeklyActivity.push({
          date: format(monthDate, 'yyyy-MM'),
          pomodoros: monthSessions.length,
          minutes: monthSessions.reduce((sum, s) => sum + getEffectiveMinutes(s), 0)
        })
      }
    } else if (daysCount === 30) {
      // Для месяца - разбивка по дням
      const baseMonth = subMonths(now, activityOffset)
      const rangeStart = startOfMonth(baseMonth)
      const rangeEnd = endOfMonth(baseMonth)
      activityRangeStart = format(rangeStart, 'yyyy-MM-dd')
      activityRangeEnd = format(rangeEnd, 'yyyy-MM-dd')
      
      let currentDay = rangeStart
      while (currentDay <= rangeEnd) {
        const dayStart = startOfDay(currentDay)
        const dayEnd = endOfDay(currentDay)
        
        const daySessions = allWorkSessions.filter(session => {
          const sessionDate = getSessionAttributionDate(session)
          return sessionDate >= dayStart && sessionDate <= dayEnd
        })
        
        weeklyActivity.push({
          date: format(currentDay, 'yyyy-MM-dd'),
          pomodoros: daySessions.length,
          minutes: daySessions.reduce((sum, s) => sum + getEffectiveMinutes(s), 0)
        })
        currentDay = new Date(currentDay)
        currentDay.setDate(currentDay.getDate() + 1)
      }
    } else {
      // Для 7 дней (неделя) - Mon-Sun с поддержкой смещения
      const baseWeek = subWeeks(now, activityOffset)
      const rangeStart = startOfWeek(baseWeek, { weekStartsOn: 1 })
      const rangeEnd = endOfWeek(baseWeek, { weekStartsOn: 1 })
      activityRangeStart = format(rangeStart, 'yyyy-MM-dd')
      activityRangeEnd = format(rangeEnd, 'yyyy-MM-dd')
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(rangeStart)
        date.setDate(rangeStart.getDate() + i)
        const dayStart = startOfDay(date)
        const dayEnd = endOfDay(date)
        
        const daySessions = allWorkSessions.filter(session => {
          const sessionDate = getSessionAttributionDate(session)
          return sessionDate >= dayStart && sessionDate <= dayEnd
        })
        
        weeklyActivity.push({
          date: format(date, 'yyyy-MM-dd'),
          pomodoros: daySessions.length,
          minutes: daySessions.reduce((sum, s) => sum + getEffectiveMinutes(s), 0)
        })
      }
    }

    // Карта активности за год (heatmap) - последние 365 дней или выбранный календарный год
    const yearlyHeatmap = []
    const heatmapRangeStart = selectedHeatmapRange === 'rolling'
      ? startOfDay(subDays(now, 364))
      : startOfYear(new Date(parseInt(selectedHeatmapRange, 10), 0, 1))
    const heatmapRangeEnd = selectedHeatmapRange === 'rolling'
      ? endOfDay(now)
      : endOfDay(new Date(parseInt(selectedHeatmapRange, 10), 11, 31))
    
    // Генерируем данные для каждого дня
    let currentDate = heatmapRangeStart
    let weekIndex = 0
    
    while (currentDate <= heatmapRangeEnd) {
      const dayStart = startOfDay(currentDate)
      
      if (selectedHeatmapRange === 'rolling' && dayStart > now) {
        break
      }
      
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
        minutes: daySessions.reduce((sum, s) => sum + getEffectiveMinutes(s), 0),
        date: format(currentDate, 'yyyy-MM-dd')
      })
      
      // Переходим к следующему дню
      currentDate = new Date(currentDate)
      currentDate.setDate(currentDate.getDate() + 1)
      
      // Если начинается новая неделя (воскресенье), увеличиваем индекс недели
      if (currentDate.getDay() === 0 && currentDate <= heatmapRangeEnd) {
        weekIndex++
      }
    }

    const heatmapTotalMinutes = yearlyHeatmap.reduce((sum, day) => sum + day.minutes, 0)
    const heatmapActiveDays = yearlyHeatmap.filter((day) => day.pomodoros > 0).length
    const heatmapBestDayMinutes = yearlyHeatmap.reduce(
      (max, day) => Math.max(max, day.minutes),
      0
    )

    // Разбивка по месяцам (последние 12 месяцев)
    const monthlyBreakdown = []
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStartDate = startOfMonth(monthDate)
      const monthEndDate = endOfMonth(monthDate)
      
      const monthSessions = allWorkSessions.filter(session => {
        const sessionDate = getSessionAttributionDate(session)
        return sessionDate >= monthStartDate && sessionDate <= monthEndDate
      })
      
      monthlyBreakdown.push({
        month: format(monthDate, 'MMM'),
        monthIndex: monthDate.getMonth(),
        pomodoros: monthSessions.length,
        minutes: monthSessions.reduce((sum, s) => sum + getEffectiveMinutes(s), 0)
      })
    }

    // Тренды продуктивности
    // 1. Лучшее время дня (по часам)
    const sessionsByHour = new Map<number, number>()
    allFocusSessions.forEach(session => {
      const hour = getSessionAttributionDate(session).getHours()
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
    const bestTimeEfficiency = allFocusSessions.length > 0 
      ? Math.round((maxSessions / allFocusSessions.length) * 100) 
      : 0

    // 2. Лучший день недели
    const sessionsByDayOfWeek = new Map<number, number>()
    allFocusSessions.forEach(session => {
      const dayOfWeek = getSessionAttributionDate(session).getDay()
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
    
    const daysNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const bestDayName = daysNames[bestDayOfWeek]
    
    // Считаем количество уникальных дней для этого дня недели
    const uniqueDaysOfWeek = new Set<string>()
    allFocusSessions.forEach(session => {
      const date = getSessionAttributionDate(session)
      if (date.getDay() === bestDayOfWeek) {
        uniqueDaysOfWeek.add(format(date, 'yyyy-MM-dd'))
      }
    })
    const avgPomodorosPerBestDay = uniqueDaysOfWeek.size > 0 
      ? (maxDaySessions / uniqueDaysOfWeek.size).toFixed(1) 
      : '0'

    // 3. Средняя длительность фокус-режима
    const avgSessionDuration = allFocusSessions.length > 0 
      ? Math.round(allFocusSessions.reduce((sum, s) => sum + getEffectiveMinutes(s), 0) / allFocusSessions.length) 
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
      const dayDate = subDays(now, i + timelineOffset)
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
          duration: getEffectiveMinutes(session)
        }
      }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

      const totalFocusMinutesDay = sessionsWithTiming
        .filter(s => s.type === 'WORK' || s.type === 'TIME_TRACKING')
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

    const taskTimeMap = new Map<string, number>()
    allFocusSessions.forEach((session) => {
      const taskName = session.task?.trim() || 'Без названия'
      taskTimeMap.set(taskName, (taskTimeMap.get(taskName) || 0) + getEffectiveMinutes(session))
    })
    const taskTimeDistribution = Array.from(taskTimeMap.entries())
      .map(([task, minutes]) => ({ task, minutes }))
      .filter((item) => item.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)

    const stats = {
      // Верхний блок
      totalPomodoros,
      totalFocusMinutes,
      currentStreak,
      avgMinutesPerDay,
      focusTimeThisMonth,
      
      // Активность за выбранный период
      weeklyActivity,
      activityRange: {
        start: activityRangeStart,
        end: activityRangeEnd,
      },
      
      // Карта активности за год
      yearlyHeatmap,
      heatmapPeriod: {
        selected: selectedHeatmapRange,
        availableYears: availableHeatmapYears,
        totalMinutes: heatmapTotalMinutes,
        activeDays: heatmapActiveDays,
        bestDayMinutes: heatmapBestDayMinutes,
        rangeStart: format(heatmapRangeStart, 'yyyy-MM-dd'),
        rangeEnd: format(heatmapRangeEnd, 'yyyy-MM-dd')
      },
      
      // Разбивка по месяцам (последние 12 месяцев)
      monthlyBreakdown,

      // Последние 7 дней с таймлайном
      lastSevenDaysTimeline,
      
      // Тренды продуктивности
      productivityTrends,
      
      // Статистика по задачам
      taskStats,

      // Распределение времени по задачам
      taskTimeDistribution
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
