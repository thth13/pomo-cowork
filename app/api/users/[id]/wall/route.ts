import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const MAX_MESSAGE_LENGTH = 500
const DEFAULT_TAKE = 5
const MAX_TAKE = 50

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id

    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const takeParam = Number(searchParams.get('take') ?? DEFAULT_TAKE)
    const take = Number.isFinite(takeParam)
      ? Math.min(Math.max(Math.floor(takeParam), 1), MAX_TAKE)
      : DEFAULT_TAKE
    const cursor = searchParams.get('cursor')

    const wallMessages = await prisma.userWallMessage.findMany({
      where: { profileUserId: userId },
      orderBy: { createdAt: 'desc' },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: take + 1,
      select: {
        id: true,
        message: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    })

    const hasMore = wallMessages.length > take
    const result = hasMore ? wallMessages.slice(0, take) : wallMessages
    const nextCursor = hasMore ? result[result.length - 1]?.id ?? null : null

    return NextResponse.json({
      messages: result,
      hasMore,
      nextCursor,
    })
  } catch (error) {
    console.error('Wall messages error:', error)
    return NextResponse.json({ error: 'Failed to load wall messages' }, { status: 500 })
  }
}

export async function POST(
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

    const userId = params.id
    if (payload.userId === userId) {
      return NextResponse.json({ error: 'Cannot post on your own wall' }, { status: 400 })
    }

    const body = (await request.json()) as { message?: string }
    const message = body.message?.trim()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH})` }, { status: 400 })
    }

    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const created = await prisma.userWallMessage.create({
      data: {
        profileUserId: userId,
        authorId: payload.userId,
        message,
      },
      select: {
        id: true,
        message: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Wall message create error:', error)
    return NextResponse.json({ error: 'Failed to send wall message' }, { status: 500 })
  }
}
