import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/rooms/mine - List rooms where current user is owner or member
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

    const rooms = await prisma.room.findMany({
      where: {
        OR: [{ ownerId: payload.userId }, { members: { some: { userId: payload.userId } } }],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        privacy: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ rooms })
  } catch (error) {
    console.error('List my rooms error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
