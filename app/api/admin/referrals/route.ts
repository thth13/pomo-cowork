import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { isAdminUser } from '@/lib/admin'
import crypto from 'crypto'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface CreateReferralBody {
  label?: string
  code?: string
}

const normalizeLabel = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, 80)
}

const normalizeCode = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^[a-zA-Z0-9_-]{4,32}$/.test(trimmed)) return null
  return trimmed
}

const generateCode = (): string => {
  return crypto.randomBytes(9).toString('base64url')
}

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

export async function GET(request: NextRequest) {
  try {
    const adminResult = await getAdminUser(request)
    if (adminResult.error) {
      return adminResult.error
    }

    const referrals = await prisma.referralLink.findMany({
      where: { isArchived: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        label: true,
        createdAt: true,
        createdBy: { select: { id: true, email: true } },
        _count: { select: { clicks: true, signups: true } },
      },
    })

    const payload = referrals.map((item) => ({
      id: item.id,
      code: item.code,
      label: item.label,
      createdAt: item.createdAt,
      createdBy: item.createdBy,
      clicksCount: item._count.clicks,
      signupsCount: item._count.signups,
    }))

    return NextResponse.json(payload)
  } catch (error) {
    console.error('List referral links error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminResult = await getAdminUser(request)
    if (adminResult.error) {
      return adminResult.error
    }

    const body = (await request.json().catch(() => null)) as CreateReferralBody | null
    const label = normalizeLabel(body?.label)
    const requestedCode = normalizeCode(body?.code)

    const code = requestedCode ?? generateCode()
console.log(123)
    const referral = await prisma.referralLink.create({
      data: {
        code,
        label,
        createdById: adminResult.user.id,
      },
      select: {
        id: true,
        code: true,
        label: true,
        createdAt: true,
      },
    })
console.log(321)
    return NextResponse.json(referral, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Code already exists' }, { status: 409 })
    }
    console.error('Create referral link error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
