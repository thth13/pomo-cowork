import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/rooms/[id]/leave - Owners must choose a successor or confirm deletion when alone.
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

    const body = await request.json().catch(() => null)
    const nextOwnerId = typeof body?.nextOwnerId === 'string' ? body.nextOwnerId : null
    const confirmDelete = body?.confirmDelete === true

    return await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { id: params.id },
        select: { id: true, ownerId: true },
      })
      if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      if (room.ownerId === payload.userId) {
        const otherMembers = await tx.roomMember.findMany({
          where: { roomId: params.id, userId: { not: payload.userId } },
          select: { userId: true },
        })

        if (otherMembers.length === 0) {
          if (!confirmDelete || nextOwnerId) {
            return NextResponse.json({ error: 'Confirm room deletion', code: 'ROOM_MEMBERS_CHANGED' }, { status: 409 })
          }
          await tx.room.delete({ where: { id: params.id } })
          return NextResponse.json({ ok: true, deletedRoom: true })
        }

        if (confirmDelete || !nextOwnerId || !otherMembers.some(member => member.userId === nextOwnerId)) {
          return NextResponse.json({ error: 'Choose a current participant as the new owner', code: 'ROOM_MEMBERS_CHANGED' }, { status: 409 })
        }

        await tx.room.update({ where: { id: params.id }, data: { ownerId: nextOwnerId } })
        await tx.roomMember.update({
          where: { roomId_userId: { roomId: params.id, userId: nextOwnerId } },
          data: { role: 'OWNER' },
        })
        await tx.roomMember.deleteMany({ where: { roomId: params.id, userId: payload.userId } })
        return NextResponse.json({ ok: true, transferredTo: nextOwnerId })
      }

      const member = await tx.roomMember.findUnique({
        where: { roomId_userId: { roomId: params.id, userId: payload.userId } },
        select: { id: true },
      })
      if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 409 })

      await tx.roomMember.delete({ where: { id: member.id } })
      return NextResponse.json({ ok: true })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: 'Room changed. Review participants and try again.', code: 'ROOM_MEMBERS_CHANGED' }, { status: 409 })
    }
    console.error('Leave room error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
