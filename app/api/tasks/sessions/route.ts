import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getEffectiveMinutes } from '@/lib/sessionStats'
import { getEffectiveSessionMinutesSql } from '@/lib/sessionStatsSql'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface TaskFocusRow {
  task: string
  focusMinutes: number
}

// GET /api/tasks/sessions?taskName=xxx
// Returns sessions for a given task name, plus all tasks summary list
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const taskName = searchParams.get('taskName')

    if (!taskName) {
      // Return tasks summary list sorted by focus time
      const effectiveMinutes = getEffectiveSessionMinutesSql('s')
      const [tasks, taskFocusRows] = await Promise.all([
        prisma.task.findMany({
          where: { userId: decoded.userId },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.$queryRaw<TaskFocusRow[]>(Prisma.sql`
          SELECT
            "s"."task",
            COALESCE(SUM(${effectiveMinutes}), 0)::integer AS "focusMinutes"
          FROM "pomodoro_sessions" AS "s"
          WHERE "s"."userId" = ${decoded.userId}
            AND "s"."type" IN ('WORK', 'TIME_TRACKING')
            AND "s"."status" IN ('COMPLETED', 'CANCELLED')
          GROUP BY "s"."task"
        `),
      ])

      const focusMinutesByTask = new Map<string, number>()
      taskFocusRows.forEach((row) => {
        focusMinutesByTask.set(row.task, row.focusMinutes)
      })

      const tasksWithStats = tasks
        .map((task) => ({
          id: task.id,
          title: task.title,
          completed: task.completed,
          priority: task.priority,
          focusMinutes: focusMinutesByTask.get(task.title) ?? 0,
        }))
        .sort((a, b) => b.focusMinutes - a.focusMinutes)

      return NextResponse.json({ tasks: tasksWithStats })
    }

    // Return sessions for a specific task name
    const sessions = await prisma.pomodoroSession.findMany({
      where: {
        userId: decoded.userId,
        task: taskName,
        type: { in: ['WORK', 'TIME_TRACKING'] },
        status: { in: ['COMPLETED', 'CANCELLED'] },
      },
      orderBy: { startedAt: 'desc' },
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
    })

    const sessionsWithMinutes = sessions.map((session) => ({
      ...session,
      effectiveMinutes: getEffectiveMinutes(session),
    }))

    const totalMinutes = sessionsWithMinutes.reduce((sum, s) => sum + s.effectiveMinutes, 0)

    return NextResponse.json({ sessions: sessionsWithMinutes, totalMinutes })
  } catch (error) {
    console.error('Get task sessions error:', error)
    return NextResponse.json({ error: 'Failed to fetch task sessions' }, { status: 500 })
  }
}
