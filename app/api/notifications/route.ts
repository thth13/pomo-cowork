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

    const notifications = await prisma.notification.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
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
      },
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: payload.userId, readAt: null },
    })

    return NextResponse.json({ unreadCount, notifications })
  } catch (error) {
    console.error('List notifications error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
