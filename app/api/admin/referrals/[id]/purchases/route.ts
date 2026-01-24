import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { isAdminUser } from '@/lib/admin'

export const dynamic = 'force-dynamic'

const YEARLY_THRESHOLD_DAYS = 200
const MS_PER_DAY = 1000 * 60 * 60 * 24
const REFERRAL_SHARE = 0.5

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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const adminResult = await getAdminUser(request)
    if (adminResult.error) {
      return adminResult.error
    }

    const signups = await prisma.referralSignup.findMany({
      where: { referralId: params.id },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            avatarUrl: true,
            createdAt: true,
            isPro: true,
            proExpiresAt: true,
          },
        },
      },
    })

    const purchases = signups.flatMap((signup) => {
      if (!signup.user.isPro || !signup.user.proExpiresAt) return []

      const durationDays =
        (signup.user.proExpiresAt.getTime() - signup.createdAt.getTime()) / MS_PER_DAY
      const subscriptionPlan = durationDays >= YEARLY_THRESHOLD_DAYS ? 'YEARLY' : 'MONTHLY'
      const basePrice = subscriptionPlan === 'YEARLY' ? 60 : 7
      const amount = basePrice * REFERRAL_SHARE

      return [
        {
          purchaseCreatedAt: signup.createdAt,
          subscriptionPlan,
          amount,
          user: {
            id: signup.user.id,
            email: signup.user.email,
            username: signup.user.username,
            avatarUrl: signup.user.avatarUrl,
            createdAt: signup.user.createdAt,
          },
        },
      ]
    })

    return NextResponse.json(purchases)
  } catch (error) {
    console.error('List referral purchases error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}