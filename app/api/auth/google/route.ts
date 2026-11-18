import { recordUserCountry } from '@/lib/userCountry'
import { removeRequestGuestVisit } from '@/lib/guestVisits'
import { resolveGoogleUser } from '@/lib/googleUser'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { generateToken } from '@/lib/auth'
import { recordReferralSignup } from '@/lib/referrals'
import { isValidAnonymousId } from '@/lib/anonymousProfile'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

type UserWithSettings = Prisma.UserGetPayload<{ include: { settings: true } }>

type GoogleTokenPayload = {
  email: string
  name?: string
  picture?: string
  aud?: string
  azp?: string
  exp?: string
}

const verifyGoogleToken = async (token: string): Promise<GoogleTokenPayload | null> => {
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`)

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as GoogleTokenPayload
    const audience = payload.aud || payload.azp

    if (GOOGLE_CLIENT_ID && audience && audience !== GOOGLE_CLIENT_ID) {
      return null
    }

    if (payload.exp && Number(payload.exp) * 1000 < Date.now()) {
      return null
    }

    return payload.email ? payload : null
  } catch (error) {
    console.error('Failed to verify Google token:', error)
    return null
  }
}

const buildUserPayload = (user: UserWithSettings) => {
  const { password: _, countryCode: _countryCode, ...userWithoutPassword } = user
  return userWithoutPassword
}

export async function POST(request: NextRequest) {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json({ error: 'Google OAuth is not configured' }, { status: 500 })
    }

    const {
      token,
      anonymousId: rawAnonymousId,
      referralCode
    } = await request.json()
    const anonymousId = isValidAnonymousId(rawAnonymousId) ? rawAnonymousId : null

    if (!token) {
      return NextResponse.json({ error: 'Google token is required' }, { status: 400 })
    }

    const payload = await verifyGoogleToken(token)
    if (!payload || !payload.email) {
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 })
    }

    const { user, convertedAnonymousId } = await resolveGoogleUser(payload, anonymousId)

    await recordUserCountry(request, user.id)
    await removeRequestGuestVisit(request, anonymousId, user.id)

    await recordReferralSignup(referralCode, user.id)

    const jwtToken = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    })

    return NextResponse.json({
      user: buildUserPayload(user),
      token: jwtToken,
      convertedAnonymousId,
    })
  } catch (error) {
    console.error('Google auth error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
