import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { isValidAnonymousId } from '@/lib/anonymousProfile'
import { verifySessionPresenceToken } from '@/lib/sessionPresence'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }

/** Verify a connected publisher; this endpoint never lists online users. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => null)
    const token = getTokenFromHeader(request.headers.get('authorization'))
    const authenticatedId = token ? verifyToken(token)?.userId : null
    const anonymousId = body?.anonymousId
    const userId = authenticatedId ?? (!token && isValidAnonymousId(anonymousId) &&
      verifySessionPresenceToken(body?.presenceToken, params.id, anonymousId) ? anonymousId : null)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })

    const user = await prisma.user.findFirst({
      where: { id: userId, ...(!authenticatedId ? { isAnonymous: true } : {}) },
      select: { id: true, username: true, avatarUrl: true, experience: true, isPro: true, proExpiresAt: true },
    })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
    const session = await prisma.$transaction(tx => tx.pomodoroSession.findFirst({
      where: { id: params.id, userId },
      include: { room: { select: { privacy: true, ownerId: true, members: { where: { userId }, select: { id: true } } } } },
    }), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
    // A verified owner may retract an already deleted/inaccessible session, but
    // cannot supply replacement room/task data to publish on its behalf.
    if (!session || (session.room?.privacy === 'PRIVATE' && session.room.ownerId !== userId && !session.room.members.length)) {
      return NextResponse.json({ userId, session: null }, { headers })
    }
    const remaining = session.status === 'PAUSED'
      ? session.remainingSeconds ?? session.duration * 60
      : session.duration * 60 - Math.floor((Date.now() - session.startedAt.getTime()) / 1000)
    return NextResponse.json({ userId, session: {
      id: session.id, userId, username: user.username, avatarUrl: user.avatarUrl,
      experience: user.experience, isPro: Boolean(user.isPro && (!user.proExpiresAt || user.proExpiresAt > new Date())),
      roomId: session.roomId, task: session.task, duration: session.duration, type: session.type,
      status: session.status, startedAt: session.startedAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      timeRemaining: Math.max(0, Math.min(session.duration * 60, remaining)),
    } }, { headers })
  } catch {
    return NextResponse.json({ error: 'Presence verification unavailable' }, { status: 503, headers })
  }
}
