import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { getEffectiveMinutes } from '@/lib/sessionStats'
import { MIN_ROOM_CHALLENGE_MINUTES, MAX_ROOM_CHALLENGE_MINUTES, type RoomDailyChallenge } from '@/lib/roomChallenge'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'))
    const userId = (token ? verifyToken(token) : null)?.userId
    const room = await prisma.room.findFirst({
      where: {
        id: params.id,
        OR: [
          { privacy: 'PUBLIC' },
          ...(userId ? [{ ownerId: userId }, { members: { some: { userId } } }] : []),
        ],
      },
      select: {
        challenge: { select: { title: true, targetMinutes: true } },
        owner: { select: { id: true, username: true, avatarUrl: true } },
        members: { select: { user: { select: { id: true, username: true, avatarUrl: true } } } },
      },
    })
    if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!room.challenge) return NextResponse.json(null, { headers: { 'Cache-Control': 'private, no-store' } })

    // A shared UTC day keeps everyone in the room on the same challenge.
    const now = new Date()
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const end = new Date(start.getTime() + 86_400_000)
    const users = new Map([room.owner, ...room.members.map(member => member.user)].map(user => [user.id, user]))
    const sessions = await prisma.pomodoroSession.findMany({
      where: {
        roomId: params.id,
        userId: { in: Array.from(users.keys()) },
        type: { in: ['WORK', 'TIME_TRACKING'] },
        status: { in: ['COMPLETED', 'CANCELLED'] },
        // Match sessionStats attribution: completedAt, then endedAt, then startedAt.
        OR: [
          { completedAt: { gte: start, lt: end } },
          { completedAt: null, endedAt: { gte: start, lt: end } },
          { completedAt: null, endedAt: null, startedAt: { gte: start, lt: end } },
        ],
      },
      select: { userId: true, type: true, status: true, duration: true, startedAt: true, endedAt: true, completedAt: true, pausedAt: true, remainingSeconds: true },
    })
    const minutes = new Map<string, number>()
    for (const session of sessions) {
      minutes.set(session.userId, (minutes.get(session.userId) ?? 0) + getEffectiveMinutes(session))
    }
    const result: RoomDailyChallenge = {
      title: room.challenge.title,
      targetMinutes: room.challenge.targetMinutes,
      date: start.toISOString().slice(0, 10),
      resetsAt: end.toISOString(),
      participants: Array.from(users.values()).map(user => ({ ...user, minutes: minutes.get(user.id) ?? 0 }))
        .sort((a, b) => b.minutes - a.minutes || a.username.localeCompare(b.username) || a.id.localeCompare(b.id)),
    }
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Room challenge error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'))
    const payload = token ? verifyToken(token) : null
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const room = await prisma.room.findUnique({ where: { id: params.id }, select: { ownerId: true } })
    if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (room.ownerId !== payload.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => null)
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const targetMinutes = body?.targetMinutes
    if (!title || title.length > 80 || !Number.isInteger(targetMinutes) || targetMinutes < MIN_ROOM_CHALLENGE_MINUTES || targetMinutes > MAX_ROOM_CHALLENGE_MINUTES) {
      return NextResponse.json({ error: 'Enter a title (1–80 characters) and a whole-minute target between 5 and 480.' }, { status: 400 })
    }
    const challenge = await prisma.roomChallenge.upsert({
      where: { roomId: params.id },
      create: { roomId: params.id, title, targetMinutes },
      update: { title, targetMinutes },
      select: { title: true, targetMinutes: true },
    })
    return NextResponse.json(challenge)
  } catch (error) {
    console.error('Save room challenge error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
