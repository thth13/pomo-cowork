import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/notifications - List current user's notifications
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const history = request.nextUrl.searchParams.get('scope') === 'all'
    const cursorId = history ? request.nextUrl.searchParams.get('cursor') : null
    const cursor = cursorId ? await prisma.notification.findFirst({
      where: { id: cursorId, userId: payload.userId },
      select: { id: true, createdAt: true },
    }) : null
    if (cursorId && !cursor) {
      return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 })
    }
    const limit = history ? 30 : 20
    const notifications = await prisma.notification.findMany({
      where: {
        userId: payload.userId,
        ...(!history ? { readAt: null } : {}),
        ...(cursor ? { OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ] } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        readAt: true,
        createdAt: true,
        roomInviteId: true,
        roomInvite: {
          select: {
            id: true,
            status: true,
            roomId: true,
            room: { select: { id: true, name: true } },
            inviter: { select: { id: true, username: true, avatarUrl: true } },
          },
        },
        wrappedMonth: true,
        wallMessageId: true,
        wallMessage: {
          select: {
            id: true,
            message: true,
            profileUserId: true,
            author: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    })

    const unreadCount = await prisma.notification.count({ where: { userId: payload.userId, readAt: null } })
    const items = notifications.slice(0, limit)
    return NextResponse.json({
      unreadCount,
      notifications: items,
      nextCursor: notifications.length > limit ? items[items.length - 1].id : null,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('List notifications error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
