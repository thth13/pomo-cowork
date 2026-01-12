import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface PatchBody {
  read?: boolean
}

// PATCH /api/notifications/[id] - Mark notification as read
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

    const body = (await request.json().catch(() => null)) as PatchBody | null
    const shouldRead = body?.read === true

    const existing = await prisma.notification.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true },
    })

    if (!existing || existing.userId !== payload.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await prisma.notification.update({
      where: { id: params.id },
      data: {
        ...(shouldRead ? { readAt: new Date() } : {}),
      },
      select: {
        id: true,
        readAt: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update notification error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
