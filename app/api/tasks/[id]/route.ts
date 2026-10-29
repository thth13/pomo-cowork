import { isProjectColor } from '@/lib/projectColors'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveTaskUserId } from '@/lib/taskAuth'

export const dynamic = 'force-dynamic'

const TASK_PRIORITIES = new Set(['Critical', 'High', 'Medium', 'Low'])

// PUT - обновить задачу
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await resolveTaskUserId(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { color, title, description, pomodoros, priority, completed, incrementPomodoro } = body

    if (incrementPomodoro !== undefined && typeof incrementPomodoro !== 'boolean') {
      return NextResponse.json({ error: 'Invalid incrementPomodoro value' }, { status: 400 })
    }

    // Older tabs still send this after completing a session. The completion
    // transaction now owns the counter; acknowledge without counting it again.
    if (incrementPomodoro) {
      const task = await prisma.task.findFirst({ where: { id: params.id, userId } })
      return task ? NextResponse.json(task) : NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return NextResponse.json({ error: 'Invalid title' }, { status: 400 })
    }

    if (color !== undefined && color !== null && !isProjectColor(color)) {
      return NextResponse.json({ error: 'Invalid project color' }, { status: 400 })
    }

    if (color !== undefined) {
      const project = await prisma.task.findFirst({ where: { id: params.id, userId } })
      if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      if (project.parentId) return NextResponse.json({ error: 'Only projects can have a color' }, { status: 400 })
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

    if (completed !== undefined && typeof completed !== 'boolean') {
      return NextResponse.json({ error: 'Invalid completed value' }, { status: 400 })
    }

    const result = await prisma.task.updateMany({
      where: {
        id: params.id,
        userId,
      },
      data: {
        ...(color !== undefined && { color }),
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(pomodoros !== undefined && { pomodoros }),
        ...(priority !== undefined && { priority }),
        ...(completed !== undefined && { completed })
      }
    })

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

// DELETE - удалить задачу
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await resolveTaskUserId(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const result = await prisma.task.deleteMany({
      where: {
        id: params.id,
        userId,
      }
    })

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
