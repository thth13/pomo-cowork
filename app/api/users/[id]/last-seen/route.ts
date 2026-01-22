import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface LastSeenPayload {
  lastSeenAt?: string
}

const getPresenceSecret = () => process.env.PRESENCE_SECRET

const isAuthorizedRequest = (request: NextRequest, userId: string) => {
  const secret = getPresenceSecret()
  const secretHeader = request.headers.get('x-presence-secret')

  if (secret && secretHeader === secret) {
    return true
  }

  if (!secret && process.env.NODE_ENV !== 'production') {
    return true
  }

  const token = getTokenFromHeader(request.headers.get('authorization'))
  if (!token) {
    return false
  }

  const payload = verifyToken(token)
  return Boolean(payload?.userId && payload.userId === userId)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id

    if (!isAuthorizedRequest(request, userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = (await request.json().catch(() => ({}))) as LastSeenPayload
    const lastSeenAt = payload.lastSeenAt ? new Date(payload.lastSeenAt) : new Date()

    if (Number.isNaN(lastSeenAt.getTime())) {
      return NextResponse.json({ error: 'Invalid lastSeenAt' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt }
    })

    return NextResponse.json({ success: true, lastSeenAt: user.lastSeenAt })
  } catch (error) {
    console.error('Error updating lastSeenAt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
