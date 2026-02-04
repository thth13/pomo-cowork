import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const dayStartParam = searchParams.get('dayStart')
    const dayEndParam = searchParams.get('dayEnd')

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

    const sessions = await prisma.pomodoroSession.findMany({
      where: {
        status: {
          in: ['COMPLETED', 'CANCELLED']
        },
        startedAt: {
          gte: dayStart,
          lt: dayEnd
        },
        roomId: roomId || null
      },
      include: {
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
      }
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching today sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}
