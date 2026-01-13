import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// POST /api/rooms/[id]/join - Join a public room (auth required)
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
      select: {
        id: true,
        privacy: true,
        ownerId: true,
      },
    })

    if (!room) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (room.privacy !== 'PUBLIC') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
      await prisma.roomMember.create({
        data: {
          roomId: room.id,
          userId: payload.userId,
          role: room.ownerId === payload.userId ? 'OWNER' : 'MEMBER',
        },
        select: { id: true },
      })

      return NextResponse.json({ ok: true, joined: true })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Already a member (or concurrent join request won the race)
        return NextResponse.json({ ok: true, joined: false })
      }

      throw error
    }
  } catch (error) {
    console.error('Join room error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
