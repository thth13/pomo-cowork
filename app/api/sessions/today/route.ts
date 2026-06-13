import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const dayStartParam = searchParams.get('dayStart')
    const dayEndParam = searchParams.get('dayEnd')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const pageSize = 10

    const now = new Date()
    const dayStart = dayStartParam ? new Date(dayStartParam) : new Date(now)
    if (!dayStartParam) {
      dayStart.setHours(0, 0, 0, 0)
    }

    const dayEnd = dayEndParam ? new Date(dayEndParam) : new Date(dayStart)
    if (!dayEndParam) {
      dayEnd.setDate(dayEnd.getDate() + 1)
    }

    if (Number.isNaN(dayStart.getTime()) || Number.isNaN(dayEnd.getTime()) || dayStart >= dayEnd) {
      return NextResponse.json(
        { error: 'Invalid day range' },
        { status: 400 }
      )
    }

    const where: Prisma.PomodoroSessionWhereInput = {
      status: {
        in: ['COMPLETED', 'CANCELLED']
      },
      startedAt: {
        gte: dayStart,
        lt: dayEnd
      },
      roomId: roomId || null
    }

    const [sessions, sessionCounts] = await Promise.all([
      prisma.pomodoroSession.findMany({
        where,
        select: {
          id: true,
          task: true,
          duration: true,
          type: true,
          status: true,
          startedAt: true,
          endedAt: true,
          completedAt: true,
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true
            }
          }
        },
        orderBy: {
          startedAt: 'desc'
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.pomodoroSession.groupBy({
        by: ['type', 'status'],
        where,
        _count: { _all: true },
      }),
    ])

    const total = sessionCounts.reduce(
      (sum, entry) => sum + entry._count._all,
      0
    )
    const completedCountsByType = Object.fromEntries(
      sessionCounts
        .filter((entry) => entry.status === 'COMPLETED')
        .map((entry) => [entry.type, entry._count._all])
    )

    return NextResponse.json({
      sessions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      stats: {
        work: completedCountsByType.WORK ?? 0,
        shortBreak: completedCountsByType.SHORT_BREAK ?? 0,
        longBreak: completedCountsByType.LONG_BREAK ?? 0,
      },
    })
  } catch (error) {
    console.error('Error fetching today sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}
