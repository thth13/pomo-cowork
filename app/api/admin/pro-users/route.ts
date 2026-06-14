import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { isAdminUser } from '@/lib/admin'
import { addMonths } from 'date-fns'

export const dynamic = 'force-dynamic'

const getAdminUser = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization')
  const token = getTokenFromHeader(authHeader)

  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const payload = verifyToken(token)
  if (!payload) {
    return { error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) }
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true },
  })

  if (!user || !isAdminUser(user)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user }
}

export async function GET(request: NextRequest) {
  try {
    const adminResult = await getAdminUser(request)
    if (adminResult.error) {
      return adminResult.error
    }

    const now = new Date()
    const users = await prisma.user.findMany({
      where: {
        isPro: true,
        OR: [{ proExpiresAt: null }, { proExpiresAt: { gt: now } }],
      },
      orderBy: [{ proExpiresAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        proExpiresAt: true,
        createdAt: true,
        lastSeenAt: true,
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Failed to load pro users', error)
    return NextResponse.json({ error: 'Failed to load pro users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminResult = await getAdminUser(request)
    if (adminResult.error) {
      return adminResult.error
    }

    const body = await request.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
        isAnonymous: false,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        isPro: true,
        proExpiresAt: true,
        createdAt: true,
        lastSeenAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.isPro && !user.proExpiresAt) {
      return NextResponse.json({
        status: 'already_lifetime',
        user,
      })
    }

    const now = new Date()
    const startsAt =
      user.isPro && user.proExpiresAt && user.proExpiresAt > now ? user.proExpiresAt : now
    const proExpiresAt = addMonths(startsAt, 1)

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isPro: true,
        proExpiresAt,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        proExpiresAt: true,
        createdAt: true,
        lastSeenAt: true,
      },
    })

    return NextResponse.json({
      status: 'granted',
      user: updatedUser,
    })
  } catch (error) {
    console.error('Failed to grant pro access', error)
    return NextResponse.json({ error: 'Failed to grant pro access' }, { status: 500 })
  }
}
