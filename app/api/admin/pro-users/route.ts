import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { isAdminUser } from '@/lib/admin'

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
