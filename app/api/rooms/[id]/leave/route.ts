import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/rooms/[id]/leave - Leave room (owner can leave too: ownership transfers; if alone, room is deleted)
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

    const room = await prisma.room.findUnique({
      where: { id: params.id },
      select: { id: true, ownerId: true },
    })

    if (!room) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (room.ownerId === payload.userId) {
      const nextOwner = await prisma.roomMember.findFirst({
        where: {
          roomId: params.id,
          userId: { not: payload.userId },
        },
        orderBy: { createdAt: 'asc' },
        select: { userId: true },
      })

      if (!nextOwner) {
        await prisma.room.delete({ where: { id: params.id } })
        return NextResponse.json({ ok: true, deletedRoom: true })
      }

      await prisma.$transaction([
        prisma.room.update({
          where: { id: params.id },
          data: { ownerId: nextOwner.userId },
        }),
        prisma.roomMember.update({
          where: { roomId_userId: { roomId: params.id, userId: nextOwner.userId } },
          data: { role: 'OWNER' },
        }),
        prisma.roomMember.deleteMany({
          where: { roomId: params.id, userId: payload.userId },
        }),
      ])

      return NextResponse.json({ ok: true, transferredTo: nextOwner.userId })
    }

    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: params.id, userId: payload.userId } },
      select: { id: true },
    })

    if (!member) {
      return NextResponse.json({ error: 'Not a member' }, { status: 409 })
    }

    await prisma.roomMember.delete({
      where: { roomId_userId: { roomId: params.id, userId: payload.userId } },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Leave room error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
