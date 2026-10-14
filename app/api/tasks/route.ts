import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { listFocusProjects } from '@/lib/focusProjects'
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

    return NextResponse.json(await listFocusProjects(userId))
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
    const userId = await resolveTaskUserId(request, true)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, description, pomodoros, priority, parentId } = body

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

    if (parentId !== undefined) {
      if (typeof parentId !== 'string') return NextResponse.json({ error: 'Invalid project' }, { status: 400 })
      const parent = await prisma.task.findFirst({ where: { id: parentId, userId, parentId: null, completed: false } })
      if (!parent) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const task = await prisma.task.create({
      data: {
        userId,
        parentId: parentId ?? null,
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
