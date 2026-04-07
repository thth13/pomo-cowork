import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const PADDLE_API_URL =
  process.env.PADDLE_ENV === 'sandbox'
    ? 'https://sandbox-api.paddle.com'
    : 'https://api.paddle.com'

const MONTHLY_PRICE_ID = process.env.PADDLE_PRICE_ID_PRO_MONTHLY
const YEARLY_PRICE_ID = process.env.PADDLE_PRICE_ID_PRO_YEARLY

const PAID_TRANSACTION_STATUSES = new Set(['paid', 'completed', 'billed'])

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  const day = d.getDate()
  d.setMonth(d.getMonth() + months)
  if (d.getDate() < day) d.setDate(0)
  return d
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function getTransaction(transactionId: string) {
  const paddleRes = await fetch(`${PADDLE_API_URL}/transactions/${transactionId}`, {
    headers: { Authorization: `Bearer ${process.env.PADDLE_API_KEY}` },
    cache: 'no-store',
  })

  const paddleData = await paddleRes.json()

  if (!paddleRes.ok) {
    console.error('Paddle get transaction error:', paddleData)
    throw new Error('Could not verify transaction')
  }

  return paddleData.data as Record<string, any>
}

function getTransactionPriceId(transaction: Record<string, any>): string | undefined {
  return transaction?.items?.[0]?.price?.id
    ?? transaction?.details?.line_items?.[0]?.price?.id
    ?? transaction?.items?.[0]?.price_id
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const { transactionId } = body as { transactionId?: string }
    if (!transactionId) return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 })

    let transaction: Record<string, any> | null = null

    for (let attempt = 0; attempt < 6; attempt += 1) {
      transaction = await getTransaction(transactionId)
      if (PAID_TRANSACTION_STATUSES.has(String(transaction?.status))) {
        break
      }

      if (attempt < 5) {
        await wait(1000)
      }
    }

    if (!transaction || !PAID_TRANSACTION_STATUSES.has(String(transaction?.status))) {
      return NextResponse.json(
        { error: `Transaction not ready for activation (status: ${String(transaction?.status ?? 'unknown')})` },
        { status: 409 }
      )
    }

    const txnUserId: string | undefined = transaction?.custom_data?.userId
    if (txnUserId && txnUserId !== payload.userId) {
      return NextResponse.json({ error: 'Transaction user mismatch' }, { status: 403 })
    }

    const priceId = getTransactionPriceId(transaction)
    const billingEndsAt = transaction?.billing_period?.ends_at as string | undefined
    const now = new Date()
    const proExpiresAt = billingEndsAt
      ? new Date(billingEndsAt)
      : priceId === MONTHLY_PRICE_ID
        ? addMonths(now, 1)
        : priceId === YEARLY_PRICE_ID
          ? addMonths(now, 12)
          : addMonths(now, 1)

    await prisma.user.update({
      where: { id: payload.userId },
      data: { isPro: true, proExpiresAt },
    })

    return NextResponse.json({ success: true, proExpiresAt })
  } catch (error) {
    console.error('Paddle activation error:', error)
    return NextResponse.json({ error: 'Activation failed' }, { status: 500 })
  }
}
