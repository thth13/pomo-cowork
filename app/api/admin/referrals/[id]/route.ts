import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { isAdminUser } from '@/lib/admin'

export const dynamic = 'force-dynamic'

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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const adminResult = await getAdminUser(request)
    if (adminResult.error) {
      return adminResult.error
    }

    const referral = await prisma.referralLink.update({
      where: { id: params.id },
      data: { isArchived: true },
      select: { id: true },
    })

    return NextResponse.json(referral)
  } catch (error) {
    console.error('Archive referral link error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
