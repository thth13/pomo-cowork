import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveTaskUserId } from '@/lib/taskAuth'
import { validHabitDate } from '@/lib/habits'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await resolveTaskUserId(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json().catch(() => null)
    if (!body || Array.isArray(body) || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid habit' }, { status: 400 })
    }
    const marking = 'date' in body || 'completed' in body
    const invalidMark = marking && (
      !validHabitDate(body.date) || typeof body.completed !== 'boolean' ||
      'title' in body || 'archived' in body
    )
    const invalidEdit = !marking && (
      (!('title' in body) && !('archived' in body)) ||
      ('title' in body && (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 120)) ||
      ('archived' in body && typeof body.archived !== 'boolean')
    )
    if (invalidMark || invalidEdit) {
      return NextResponse.json({ error: 'Invalid habit update' }, { status: 400 })
    }
    const result = await prisma.$transaction(async (tx) => {
      // Lock the owned habit for both marks and archival, including concurrent requests.
      const owned = await tx.habit.updateMany({ where: { id: params.id, userId }, data: { id: params.id } })
      if (!owned.count) return { status: 404, error: 'Habit not found' }
      const habit = await tx.habit.findUniqueOrThrow({ where: { id: params.id } })
      if (marking) {
        // Allow today's date in every timezone; the client disallows future local dates.
        const latestDate = new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString().slice(0, 10)
        if (habit.archived || body.date < habit.startDate || body.date > latestDate) return { status: 400, error: 'Date unavailable' }
        if (body.completed) {
          await tx.habitCompletion.upsert({ where: { habitId_date: { habitId: habit.id, date: body.date } }, create: { habitId: habit.id, date: body.date }, update: {} })
        } else {
          await tx.habitCompletion.deleteMany({ where: { habitId: habit.id, date: body.date } })
        }
      } else {
        await tx.habit.update({ where: { id: habit.id }, data: {
          ...('title' in body ? { title: body.title.trim() } : {}),
          ...('archived' in body ? { archived: body.archived } : {}),
        } })
      }
      return { status: 200, habit: await tx.habit.findUniqueOrThrow({ where: { id: habit.id }, include: { completions: { select: { date: true } } } }) }
    })
    return NextResponse.json(result.habit ?? { error: result.error }, { status: result.status })
  } catch (error) {
    console.error('Update habit failed:', error)
    return NextResponse.json({ error: 'Could not update habit' }, { status: 500 })
  }
}
