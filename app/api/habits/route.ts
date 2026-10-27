import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveTaskUserId } from '@/lib/taskAuth'
import { validHabitDate } from '@/lib/habits'
import { isValidAnonymousId } from '@/lib/anonymousProfile'
import { canActivateHabit, habitLimitResponse, lockHabitOwner } from '@/lib/habitAccess'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const userId = await resolveTaskUserId(request)
    if (!userId) {
      // A visitor without a timer session has no persisted profile yet.
      if (!request.headers.get('authorization') && isValidAnonymousId(request.headers.get('x-anonymous-id')?.trim())) {
        return NextResponse.json([])
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const habits = await prisma.habit.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { completions: { select: { date: true } } },
    })
    return NextResponse.json(habits)
  } catch (error) {
    console.error('Read habits failed:', error)
    return NextResponse.json({ error: 'Could not load habits' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveTaskUserId(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json().catch(() => null)
    if (!body || typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 120 || !validHabitDate(body.startDate) || typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id)) {
      return NextResponse.json({ error: 'Invalid habit' }, { status: 400 })
    }
    const latestDate = new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString().slice(0, 10)
    if (body.startDate < '1970-01-01' || body.startDate > latestDate) {
      return NextResponse.json({ error: 'Invalid start date' }, { status: 400 })
    }
    const result = await prisma.$transaction(async (tx) => {
      await lockHabitOwner(tx, userId)
      const existing = await tx.habit.findUnique({
        where: { id: body.id },
        include: { completions: { select: { date: true } } },
      })
      // A retry of a successful creation must still succeed at the limit.
      if (existing) {
        return existing.userId === userId
          ? { status: 201, body: existing }
          : { status: 409, body: { error: 'Invalid habit' } }
      }
      if (!await canActivateHabit(tx, userId)) {
        return { status: 403, body: habitLimitResponse }
      }
      const habit = await tx.habit.create({
        data: { id: body.id, userId, title: body.title.trim(), startDate: body.startDate },
        include: { completions: { select: { date: true } } },
      })
      return { status: 201, body: habit }
    })
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    console.error('Create habit failed:', error)
    return NextResponse.json({ error: 'Could not save habit' }, { status: 500 })
  }
}
