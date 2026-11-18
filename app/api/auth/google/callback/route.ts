import { recordUserCountry } from '@/lib/userCountry'
import { removeRequestGuestVisit } from '@/lib/guestVisits'
import { NextRequest, NextResponse } from 'next/server'
import { resolveGoogleUser } from '@/lib/googleUser'
import { isValidAnonymousId } from '@/lib/anonymousProfile'
import { generateToken } from '@/lib/auth'
import { normalizeReferralCode, recordReferralSignup } from '@/lib/referrals'

export const dynamic = 'force-dynamic'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

const getReferralFromState = (state: string | null): string | null => {
  if (!state) return null
  const marker = '|ref:'
  const index = state.indexOf(marker)
  if (index === -1) return null
  const raw = state.slice(index + marker.length)
  return normalizeReferralCode(raw)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const referralCode = getReferralFromState(state)

    // Проверка на ошибки от Google
    if (error) {
      return NextResponse.redirect(
        new URL(`/?auth_error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/?auth_error=missing_parameters', request.url)
      )
    }

    const [nonce, guestId] = (request.cookies.get('pomo_google_flow')?.value ?? '').split('.')
    if (!nonce || nonce !== state.split('|')[0]) {
      return NextResponse.redirect(new URL('/?auth_error=invalid_state', request.url))
    }
    const anonymousId = isValidAnonymousId(guestId) ? guestId : null

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return NextResponse.redirect(
        new URL('/?auth_error=config_error', request.url)
      )
    }

    // Обмениваем code на токен
    const redirectUri = `${new URL(request.url).origin}/api/auth/google/callback`
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect(
        new URL('/?auth_error=token_exchange_failed', request.url)
      )
    }

    const tokens = await tokenResponse.json()
    const idToken = tokens.id_token

    if (!idToken) {
      return NextResponse.redirect(
        new URL('/?auth_error=no_id_token', request.url)
      )
    }

    // Получаем информацию о пользователе
    const userInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    )

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(
        new URL('/?auth_error=invalid_token', request.url)
      )
    }

    const userInfo = await userInfoResponse.json()
    if (!userInfo.email || userInfo.aud !== GOOGLE_CLIENT_ID) {
      return NextResponse.redirect(new URL('/?auth_error=invalid_token', request.url))
    }
    const { user, convertedAnonymousId } = await resolveGoogleUser(userInfo, anonymousId)

    await recordUserCountry(request, user.id)
    await removeRequestGuestVisit(request, anonymousId, user.id)

    // Генерируем JWT токен
    await recordReferralSignup(referralCode, user.id)

    const jwtToken = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    })

    // Редиректим на главную с токеном в query params
    const redirectUrl = new URL('/', request.url)
    redirectUrl.searchParams.set('auth_token', jwtToken)

    if (convertedAnonymousId) redirectUrl.searchParams.set('guest_converted', '1')
    const response = NextResponse.redirect(redirectUrl)
    response.cookies.set('pomo_google_flow', '', { path: '/api/auth/google/callback', maxAge: 0 })
    return response
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/?auth_error=server_error', request.url)
    )
  }
}
