import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const PADDLE_API_URL =
  process.env.PADDLE_ENV === 'sandbox'
    ? 'https://sandbox-api.paddle.com'
    : 'https://api.paddle.com'

const PRICE_IDS: Record<string, string | undefined> = {
  'pro-monthly': process.env.PADDLE_PRICE_ID_PRO_MONTHLY,
  'pro-yearly': process.env.PADDLE_PRICE_ID_PRO_YEARLY,
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = getTokenFromHeader(authHeader)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const planId = body?.planId === 'pro-monthly' ? 'pro-monthly' : 'pro-yearly'
  const priceId = PRICE_IDS[planId]
  if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const transactionBody: Record<string, unknown> = {
    items: [{ price_id: priceId, quantity: 1 }],
    custom_data: { userId: user.id },
    customer: { email: user.email },
  }

  const paddleRes = await fetch(`${PADDLE_API_URL}/transactions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(transactionBody),
  })

  const paddleData = await paddleRes.json()
  if (!paddleRes.ok) {
    console.error('Paddle create transaction error:', paddleData)
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 502 })
  }

  return NextResponse.json({ transactionId: paddleData.data.id as string })
}
