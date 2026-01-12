import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { isRoomGradientKey } from '@/lib/roomGradient'

export const dynamic = 'force-dynamic'

interface UpdateRoomBody {
  name?: string
  privacy?: 'PUBLIC' | 'PRIVATE'
  backgroundGradientKey?: string | null
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

const normalizeBackgroundGradientKey = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined
  if (value === null) return null
  if (isRoomGradientKey(value)) return value
  return undefined
}

// GET /api/rooms/[id] - Fetch a room (public or member/owner)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)
    const payload = token ? verifyToken(token) : null
    const userId = payload?.userId ?? null

    const room = await prisma.room.findFirst({
      where: {
        id: params.id,
        ...(userId
          ? {
              OR: [
                { privacy: 'PUBLIC' },
                { ownerId: userId },
                { members: { some: { userId } } },
              ],
            }
          : { privacy: 'PUBLIC' }),
      },
      select: {
        id: true,
        name: true,
        privacy: true,
        ownerId: true,
        backgroundGradientKey: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!room) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(room)
  } catch (error) {
    console.error('Get room error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH /api/rooms/[id] - Update room settings (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const existing = await prisma.room.findUnique({
      where: { id: params.id },
      select: { id: true, ownerId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (existing.ownerId !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json().catch(() => null)) as UpdateRoomBody | null

    const nextName = body?.name !== undefined ? normalizeName(body.name) : null
    if (body?.name !== undefined && !nextName) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }

    const nextPrivacy = body?.privacy !== undefined ? normalizePrivacy(body.privacy) : null
    if (body?.privacy !== undefined && !nextPrivacy) {
      return NextResponse.json({ error: 'Invalid privacy' }, { status: 400 })
    }

    const nextBackgroundGradientKey = normalizeBackgroundGradientKey(body?.backgroundGradientKey)
    if (body?.backgroundGradientKey !== undefined && nextBackgroundGradientKey === undefined) {
      return NextResponse.json({ error: 'Invalid background gradient' }, { status: 400 })
    }

    const updated = await prisma.room.update({
      where: { id: params.id },
      data: {
        ...(nextName ? { name: nextName } : {}),
        ...(nextPrivacy ? { privacy: nextPrivacy } : {}),
        ...(nextBackgroundGradientKey !== undefined
          ? { backgroundGradientKey: nextBackgroundGradientKey }
          : {}),
      },
      select: {
        id: true,
        name: true,
        privacy: true,
        ownerId: true,
        backgroundGradientKey: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update room error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
