import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function getAuthenticatedUserId(request: NextRequest) {
  const token = getTokenFromHeader(request.headers.get('authorization'))
  return token ? verifyToken(token)?.userId ?? null : null
}

export async function POST(request: NextRequest) {
  const userId = getAuthenticatedUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isAnonymous: true,
        isPro: true,
        proExpiresAt: true,
      },
    })

    if (!user || user.isAnonymous) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasActivePremium =
      user.isPro && (!user.proExpiresAt || user.proExpiresAt > new Date())

    if (hasActivePremium) {
      return NextResponse.json({ status: 'already_active' })
    }

    const proExpiresAt = new Date()
    proExpiresAt.setMonth(proExpiresAt.getMonth() + 1)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isPro: true,
        proExpiresAt,
      },
    })

    return NextResponse.json({ status: 'claimed' })
  } catch (error) {
    console.error('Failed to claim promotion', error)
    return NextResponse.json({ error: 'Failed to claim promotion' }, { status: 500 })
  }
}
