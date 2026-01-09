import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface InviteBody {
  username?: string
}

const canAccessRoom = async (roomId: string, token: string | null) => {
  const payload = token ? verifyToken(token) : null
  const userId = payload?.userId ?? null

  const room = await prisma.room.findFirst({
    where: {
      id: roomId,
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
    select: { id: true },
  })

  return { ok: Boolean(room), userId }
}

// GET /api/rooms/[id]/members - List room participants (public or member/owner)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    const access = await canAccessRoom(params.id, token)
    if (!access.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const members = await prisma.roomMember.findMany({
      where: { roomId: params.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        roomId: true,
        userId: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error('List room members error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/rooms/[id]/members - Add participant by username (owner only)
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

    if (room.ownerId !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json().catch(() => null)) as InviteBody | null
    const username = typeof body?.username === 'string' ? body.username.trim() : ''
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: {
        isAnonymous: false,
        username: { equals: username, mode: 'insensitive' },
      },
      select: { id: true, username: true, avatarUrl: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const existingMember = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: params.id, userId: user.id } },
      select: { id: true },
    })

    if (existingMember) {
      return NextResponse.json({ error: 'User already in room' }, { status: 409 })
    }

    const invite = await prisma.roomInvite.upsert({
      where: { roomId_inviteeId: { roomId: params.id, inviteeId: user.id } },
      update: {
        status: 'PENDING',
      },
      create: {
        roomId: params.id,
        inviterId: payload.userId,
        inviteeId: user.id,
        status: 'PENDING',
      },
      select: {
        id: true,
        room: { select: { id: true, name: true } },
      },
    })

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'ROOM_INVITE',
        title: 'Room invite',
        message: `You were invited to join ${invite.room.name}`,
        roomInviteId: invite.id,
      },
    })

    return NextResponse.json({ inviteId: invite.id })
  } catch (error) {
    console.error('Invite room member error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
