import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const MONTHLY_PRICE_ID = process.env.PADDLE_PRICE_ID_PRO_MONTHLY
const YEARLY_PRICE_ID = process.env.PADDLE_PRICE_ID_PRO_YEARLY

function verifySignature(rawBody: string, header: string, secret: string): boolean {
  const parts: Record<string, string> = {}
  for (const part of header.split(';')) {
    const [k, v] = part.split('=')
    if (k && v) parts[k] = v
  }
  const { ts, h1 } = parts
  if (!ts || !h1) return false

  const signed = `${ts}:${rawBody}`
  const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(h1, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  const day = d.getDate()
  d.setMonth(d.getMonth() + months)
  if (d.getDate() < day) d.setDate(0)
  return d
}

function getPriceId(data: Record<string, unknown>): string | undefined {
  const items = data.items as Array<Record<string, any>> | undefined
  const details = data.details as Record<string, any> | undefined

  return items?.[0]?.price?.id
    ?? details?.line_items?.[0]?.price?.id
    ?? items?.[0]?.price_id
}

function getSubscriptionId(data: Record<string, unknown>): string | undefined {
  const details = data.details as Record<string, any> | undefined

  return (data.id as string | undefined)
    ?? (data.subscription_id as string | undefined)
    ?? details?.subscription?.id
}

function getScheduledCancelDate(data: Record<string, unknown>): Date | null {
  const scheduledChange = data.scheduled_change as Record<string, any> | null
  const effectiveAt = scheduledChange?.action === 'cancel'
    ? scheduledChange?.effective_at as string | undefined
    : undefined
  const canceledAt = data.canceled_at as string | undefined

  if (effectiveAt) {
    return new Date(effectiveAt)
  }

  if (canceledAt) {
    return new Date(canceledAt)
  }

  return null
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signatureHeader = request.headers.get('paddle-signature')
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET

  if (webhookSecret) {
    if (!signatureHeader || !verifySignature(rawBody, signatureHeader, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } else {
    console.warn('PADDLE_WEBHOOK_SECRET not set — skipping signature verification')
  }

  let event: { event_type?: string; data?: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event_type: eventType, data } = event
  if (!eventType || !data) return NextResponse.json({ ok: true })

  const customData = data.custom_data as Record<string, string> | null
  const userId = customData?.userId

  if (eventType === 'transaction.completed' || eventType === 'transaction.paid') {
    if (!userId) {
      console.warn(`Paddle webhook ${eventType}: missing userId in custom_data`)
      return NextResponse.json({ ok: true })
    }

    const billingPeriod = data.billing_period as { ends_at?: string } | null
    const priceId = getPriceId(data)
    const subscriptionId = getSubscriptionId(data)
    const proExpiresAt = billingPeriod?.ends_at
      ? new Date(billingPeriod.ends_at)
      : priceId === YEARLY_PRICE_ID
        ? addMonths(new Date(), 12)
        : priceId === MONTHLY_PRICE_ID
          ? addMonths(new Date(), 1)
          : addMonths(new Date(), 1)

    const updateData: {
      isPro: boolean
      proExpiresAt: Date
      paddleCancelAt: null
      paddleSubscriptionId?: string
    } = {
      isPro: true,
      proExpiresAt,
      paddleCancelAt: null,
    }

    if (subscriptionId) {
      updateData.paddleSubscriptionId = subscriptionId
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })
  } else if (eventType === 'subscription.activated' || eventType === 'subscription.renewed') {
    if (!userId) {
      console.warn(`Paddle webhook ${eventType}: missing userId in custom_data`)
      return NextResponse.json({ ok: true })
    }

    const nextBilledAt = data.next_billed_at as string | null
    const subscriptionId = getSubscriptionId(data)
    const proExpiresAt = nextBilledAt ? new Date(nextBilledAt) : addMonths(new Date(), 1)

    const updateData: {
      isPro: boolean
      proExpiresAt: Date
      paddleCancelAt: null
      paddleSubscriptionId?: string
    } = {
      isPro: true,
      proExpiresAt,
      paddleCancelAt: null,
    }

    if (subscriptionId) {
      updateData.paddleSubscriptionId = subscriptionId
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })
  } else if (eventType === 'subscription.canceled') {
    if (!userId) {
      console.warn(`Paddle webhook ${eventType}: missing userId in custom_data`)
      return NextResponse.json({ ok: true })
    }

    // User paid through period — let proExpiresAt expire naturally, just clear Pro flag if already expired
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { proExpiresAt: true } })
    const paddleCancelAt = getScheduledCancelDate(data)
    if (user && user.proExpiresAt && user.proExpiresAt < new Date()) {
      await prisma.user.update({
        where: { id: userId },
        data: { isPro: false, paddleSubscriptionId: null, paddleCancelAt },
      })
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { paddleSubscriptionId: null, paddleCancelAt },
      })
    }
  } else if (eventType === 'subscription.past_due') {
    if (!userId) {
      console.warn(`Paddle webhook ${eventType}: missing userId in custom_data`)
      return NextResponse.json({ ok: true })
    }

    await prisma.user.update({ where: { id: userId }, data: { isPro: false } })
  }

  return NextResponse.json({ ok: true })
}
