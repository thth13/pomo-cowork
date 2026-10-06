import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'))
    const payload = token ? verifyToken(token) : null
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notification = await prisma.notification.findFirst({
      where: { userId: payload.userId, type: 'PREMIUM_GRANTED', readAt: null },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, message: true },
    })
    return NextResponse.json({ notification }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Load premium notification error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
