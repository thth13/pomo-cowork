import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getEffectiveMinutes } from '@/lib/sessionStats'
import { resolveTaskUserId } from '@/lib/taskAuth'

export const dynamic = 'force-dynamic'

const TASK_PRIORITIES = new Set(['Critical', 'High', 'Medium', 'Low'])

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

    const tasks = await prisma.task.findMany({
      where: {
        userId
      },
      orderBy: [
        { completed: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    const sessions = await prisma.pomodoroSession.findMany({
      where: {
        userId,
        type: 'WORK',
        status: { in: ['COMPLETED', 'CANCELLED'] }
      },
      select: {
        task: true,
        duration: true,
        startedAt: true,
        endedAt: true,
        completedAt: true,
        pausedAt: true,
        remainingSeconds: true,
        createdAt: true,
      }
    })

    const focusMinutesByTask = new Map<string, number>()
    sessions.forEach((session) => {
      const key = session.task
      const minutes = getEffectiveMinutes(session)
      focusMinutesByTask.set(key, (focusMinutesByTask.get(key) ?? 0) + minutes)
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
