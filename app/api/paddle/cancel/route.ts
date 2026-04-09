import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const PADDLE_API_URL =
  process.env.PADDLE_ENV === 'sandbox'
    ? 'https://sandbox-api.paddle.com'
    : 'https://api.paddle.com'

const SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due', 'paused']
const PRO_PRICE_IDS = [process.env.PADDLE_PRICE_ID_PRO_MONTHLY, process.env.PADDLE_PRICE_ID_PRO_YEARLY].filter(Boolean)

interface PaddleListResponse<T> {
  data: T[]
}

interface PaddleCustomer {
  id: string
  email: string
}

interface PaddleSubscriptionScheduledChange {
  action?: string
  effective_at?: string | null
}

interface PaddleSubscriptionManagementUrls {
  cancel?: string | null
}

interface PaddleSubscription {
  id: string
  status?: string
  canceled_at?: string | null
  next_billed_at?: string | null
  custom_data?: {
    userId?: string
  } | null
  scheduled_change?: PaddleSubscriptionScheduledChange | null
  management_urls?: PaddleSubscriptionManagementUrls | null
}

async function paddleRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${PADDLE_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  const payload = await response.json()

  if (!response.ok) {
    console.error('Paddle cancel subscription error:', payload)
    const message = payload?.error?.detail ?? payload?.error?.message ?? 'Paddle request failed'
    const err = new Error(message) as Error & { code?: string }
    if (response.status === 403) {
      err.code = 'paddle_forbidden'
    }
    throw err
  }

  return payload as T
}

function getScheduledCancelAt(subscription: PaddleSubscription): string | null {
  if (subscription.scheduled_change?.action === 'cancel') {
    return subscription.scheduled_change.effective_at ?? subscription.next_billed_at ?? null
  }

  return subscription.canceled_at ?? null
}

async function findCustomerIdByEmail(email: string): Promise<string | null> {
  const params = new URLSearchParams({ email, per_page: '1' })
  const response = await paddleRequest<PaddleListResponse<PaddleCustomer>>(`/customers?${params.toString()}`)

  return response.data[0]?.id ?? null
}

async function getSubscriptionById(subscriptionId: string): Promise<PaddleSubscription | null> {
  try {
    const response = await paddleRequest<{ data: PaddleSubscription }>(`/subscriptions/${subscriptionId}`)
    return response.data
  } catch (error) {
    console.warn('Stored Paddle subscription lookup failed:', error)
    return null
  }
}

async function findSubscriptionForUser(user: {
  id: string
  email: string
  paddleSubscriptionId: string | null
}): Promise<PaddleSubscription | null> {
  if (user.paddleSubscriptionId) {
    const storedSubscription = await getSubscriptionById(user.paddleSubscriptionId)
    if (storedSubscription) {
      return storedSubscription
    }
  }

  const customerId = await findCustomerIdByEmail(user.email)
  if (!customerId) {
    return null
  }

  const params = new URLSearchParams({
    customer_id: customerId,
    status: SUBSCRIPTION_STATUSES.join(','),
    per_page: '50',
  })

  if (PRO_PRICE_IDS.length > 0) {
    params.set('price_id', PRO_PRICE_IDS.join(','))
  }

  const response = await paddleRequest<PaddleListResponse<PaddleSubscription>>(`/subscriptions?${params.toString()}`)
  const exactMatch = response.data.find((subscription) => subscription.custom_data?.userId === user.id)

  if (exactMatch) {
    return exactMatch
  }

  if (response.data.length === 1) {
    return response.data[0]
  }

  return response.data.find((subscription) => subscription.status === 'active') ?? response.data[0] ?? null
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        paddleSubscriptionId: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const subscription = await findSubscriptionForUser(user)
    if (!subscription) {
      return NextResponse.json({ error: 'Active subscription not found' }, { status: 404 })
    }

    if (subscription.scheduled_change?.action === 'cancel') {
      const paddleCancelAt = getScheduledCancelAt(subscription)

      await prisma.user.update({
        where: { id: user.id },
        data: {
          paddleSubscriptionId: subscription.id,
          paddleCancelAt: paddleCancelAt ? new Date(paddleCancelAt) : null,
        },
      })

      return NextResponse.json({
        success: true,
        alreadyScheduled: true,
        paddleSubscriptionId: subscription.id,
        paddleCancelAt,
        cancelUrl: subscription.management_urls?.cancel ?? null,
      })
    }

    const response = await paddleRequest<{ data: PaddleSubscription }>(`/subscriptions/${subscription.id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ effective_from: 'next_billing_period' }),
    })

    const canceledSubscription = response.data
    const paddleCancelAt = getScheduledCancelAt(canceledSubscription)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        paddleSubscriptionId: canceledSubscription.id,
        paddleCancelAt: paddleCancelAt ? new Date(paddleCancelAt) : null,
      },
    })

    return NextResponse.json({
      success: true,
      paddleSubscriptionId: canceledSubscription.id,
      paddleCancelAt,
      cancelUrl: canceledSubscription.management_urls?.cancel ?? null,
    })
  } catch (error) {
    console.error('Cancel subscription route error:', error)
    if (error instanceof Error && (error as Error & { code?: string }).code === 'paddle_forbidden') {
      return NextResponse.json(
        { error: 'not authorized to cancel subscription', code: 'paddle_forbidden' },
        { status: 403 }
      )
    }
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
  }
}
