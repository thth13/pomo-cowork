import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getEffectiveSessionMinutesSql } from '@/lib/sessionStatsSql'
import { resolveTaskUserId } from '@/lib/taskAuth'

export const dynamic = 'force-dynamic'

const TASK_PRIORITIES = new Set(['Critical', 'High', 'Medium', 'Low'])

interface TaskFocusRow {
  task: string
  focusMinutes: number
}

// GET - получить все задачи пользователя
export async function GET(request: NextRequest) {
  try {
    const userId = await resolveTaskUserId(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const effectiveMinutes = getEffectiveSessionMinutesSql('s')
    const [tasks, taskFocusRows] = await Promise.all([
      prisma.task.findMany({
        where: {
          userId
        },
        orderBy: [
          { completed: 'asc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.$queryRaw<TaskFocusRow[]>(Prisma.sql`
        SELECT
          "s"."task",
          COALESCE(SUM(${effectiveMinutes}), 0)::integer AS "focusMinutes"
        FROM "pomodoro_sessions" AS "s"
        WHERE "s"."userId" = ${userId}
          AND "s"."type" = 'WORK'
          AND "s"."status" IN ('COMPLETED', 'CANCELLED')
        GROUP BY "s"."task"
      `),
    ])

    const focusMinutesByTask = new Map<string, number>()
    taskFocusRows.forEach((row) => {
      focusMinutesByTask.set(row.task, row.focusMinutes)
    })

    const tasksWithStats = tasks.map(task => ({
      ...task,
      focusMinutes: focusMinutesByTask.get(task.title) ?? 0,
    }))

    return NextResponse.json(tasksWithStats)
  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

// POST - создать новую задачу
export async function POST(request: NextRequest) {
  try {
    const userId = await resolveTaskUserId(request, { createAnonymous: true })

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, description, pomodoros, priority } = body

    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (description !== undefined && typeof description !== 'string') {
      return NextResponse.json({ error: 'Invalid description' }, { status: 400 })
    }

    if (pomodoros !== undefined && (!Number.isInteger(pomodoros) || pomodoros < 1)) {
      return NextResponse.json({ error: 'Invalid pomodoros' }, { status: 400 })
    }

    if (priority !== undefined && !TASK_PRIORITIES.has(priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
    }

    const task = await prisma.task.create({
      data: {
        userId,
        title: title.trim(),
        description: description ?? '',
        pomodoros: pomodoros ?? 1,
        priority: priority ?? 'Medium',
        completed: false
      }
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
