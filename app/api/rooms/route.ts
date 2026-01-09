import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface CreateRoomBody {
  name?: string
  privacy?: 'PUBLIC' | 'PRIVATE'
}

const normalizeName = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, 60)
}

const normalizePrivacy = (value: unknown): 'PUBLIC' | 'PRIVATE' | null => {
  if (value === 'PUBLIC' || value === 'PRIVATE') return value
  return null
}

// GET /api/rooms - List available rooms
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)
    const payload = token ? verifyToken(token) : null
    const userId = payload?.userId ?? null

    const rooms = await prisma.room.findMany({
      where: userId
        ? {
            OR: [
              { privacy: 'PUBLIC' },
              { ownerId: userId },
              { members: { some: { userId } } },
            ],
          }
        : { privacy: 'PUBLIC' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        privacy: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
    })

    const roomsWithCount = rooms.map(room => ({
      id: room.id,
      name: room.name,
      privacy: room.privacy,
      ownerId: room.ownerId,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      memberCount: room._count.members,
    }))

    return NextResponse.json(roomsWithCount)
  } catch (error) {
    console.error('List rooms error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/rooms - Create a room (auth required)
export async function POST(request: NextRequest) {
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

    const body = (await request.json().catch(() => null)) as CreateRoomBody | null
    const name = normalizeName(body?.name)
    const privacy = normalizePrivacy(body?.privacy) ?? 'PUBLIC'

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const room = await prisma.room.create({
      data: {
        name,
        privacy,
        ownerId: payload.userId,
        members: {
          create: {
            userId: payload.userId,
            role: 'OWNER',
          },
        },
      },
      select: {
        id: true,
        name: true,
        privacy: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(room)
  } catch (error) {
    console.error('Create room error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
