import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/room-invites/[id]/decline - Decline invite (invitee only)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    const invite = await prisma.roomInvite.findUnique({
      where: { id: params.id },
      select: { id: true, inviteeId: true, status: true },
    })

    if (!invite || invite.inviteeId !== payload.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (invite.status !== 'PENDING') {
      return NextResponse.json({ error: 'Invite already resolved' }, { status: 409 })
    }

    await prisma.$transaction([
      prisma.roomInvite.update({
        where: { id: invite.id },
        data: { status: 'DECLINED' },
      }),
      prisma.notification.updateMany({
        where: {
          userId: payload.userId,
          roomInviteId: invite.id,
          readAt: null,
        },
        data: { readAt: new Date() },
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Decline room invite error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
