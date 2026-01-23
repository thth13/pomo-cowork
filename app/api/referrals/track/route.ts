import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { normalizeReferralCode } from '@/lib/referrals'

export const dynamic = 'force-dynamic'

interface TrackReferralBody {
  code?: string
}

const getClientIp = (request: NextRequest): string | null => {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? null
  }
  return request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || null
}

const getFingerprint = (ip: string | null, userAgent: string | null): string => {
  const raw = `${ip ?? 'unknown'}|${userAgent ?? 'unknown'}`
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as TrackReferralBody | null
    const code = normalizeReferralCode(body?.code)

    if (!code) {
      return NextResponse.json({ ok: false })
    }

    const referral = await prisma.referralLink.findUnique({
      where: { code },
      select: { id: true },
    })

    if (!referral) {
      return NextResponse.json({ ok: false })
    }

    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get('user-agent')
    const fingerprint = getFingerprint(ipAddress, userAgent)

    await prisma.referralClick.upsert({
      where: {
        referralId_fingerprint: {
          referralId: referral.id,
          fingerprint,
        },
      },
      update: {},
      create: {
        referralId: referral.id,
        fingerprint,
        ipAddress,
        userAgent,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Track referral error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
