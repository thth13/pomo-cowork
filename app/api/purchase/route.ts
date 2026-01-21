import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const VLADIK_ID = 'cmklkzcqr0000snb3bo8hddjv'

const addMonths = (base: Date, months: number) => {
  const result = new Date(base)
  const day = result.getDate()
  result.setMonth(result.getMonth() + months)
  if (result.getDate() < day) {
    result.setDate(0)
  }
  return result
}

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

    const body = await request.json().catch(() => ({}))
    const planId = body?.planId === 'pro-monthly' || body?.planId === 'pro-yearly' ? body.planId : 'pro-yearly'

    const now = new Date()
    const proExpiresAt = payload.userId === VLADIK_ID
      ? new Date('2526-01-19T00:00:00.000Z')
      : planId === 'pro-monthly'
        ? addMonths(now, 1)
        : addMonths(now, 12)

    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: { isPro: true, proExpiresAt },
      select: { id: true, isPro: true, proExpiresAt: true },
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Purchase activation error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
