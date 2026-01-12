import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// DELETE /api/rooms/[id]/members/[memberId] - Remove participant (owner only)
export async function DELETE(request: NextRequest, { params }: { params: { id: string; memberId: string } }) {
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

    const room = await prisma.room.findUnique({
      where: { id: params.id },
      select: { id: true, ownerId: true },
    })

    if (!room) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (room.ownerId !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const member = await prisma.roomMember.findFirst({
      where: { id: params.memberId, roomId: params.id },
      select: { id: true, userId: true, role: true },
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    if (member.userId === room.ownerId || member.role === 'OWNER') {
      return NextResponse.json({ error: 'Cannot remove owner' }, { status: 400 })
    }

    await prisma.roomMember.delete({ where: { id: member.id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Remove room member error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
