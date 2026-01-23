import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateToken, hashPassword } from '@/lib/auth'
import { normalizeReferralCode, recordReferralSignup } from '@/lib/referrals'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

const DEFAULT_SETTINGS = {
  workDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakAfter: 4,
  soundEnabled: true,
  soundVolume: 0.5,
  notificationsEnabled: true,
} as const

const DEFAULT_TASK = {
  title: 'Welcome to Pomo Cowork!',
  description: 'This is your first task. You can edit or delete it, and add new tasks.',
  pomodoros: 1,
  priority: 'Средний',
  completed: false,
} as const

const sanitizeUsername = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || 'user'
}

const generateUniqueUsername = async (base: string): Promise<string> => {
  const sanitizedBase = sanitizeUsername(base)
  let candidate = sanitizedBase
  let attempt = 1

  while (attempt <= 50) {
    const existing = await prisma.user.findUnique({ where: { username: candidate } })
    if (!existing) {
      return candidate
    }

    candidate = `${sanitizedBase}${attempt}`
    attempt += 1
  }

  return `${sanitizedBase}${crypto.randomBytes(2).toString('hex')}`
}

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
    const email = userInfo.email?.toLowerCase()
    const displayName = userInfo.name || email?.split('@')[0]
    const avatarUrl = userInfo.picture

    if (!email) {
      return NextResponse.redirect(
        new URL('/?auth_error=no_email', request.url)
      )
    }

    // Ищем или создаем пользователя
    let user = await prisma.user.findUnique({
      where: { email },
      include: { settings: true },
    })

    if (user && !user.settings) {
      const settings = await prisma.userSettings.create({
        data: { userId: user.id, ...DEFAULT_SETTINGS },
      })
      user = { ...user, settings }
    }

    // Апгрейд анонимного пользователя (если есть)
    // Note: в sessionStorage мы не можем получить доступ на сервере,
    // поэтому передадим это на клиент через query params
    if (!user) {
      const username = await generateUniqueUsername(displayName)
      const hashedPassword = await hashPassword(crypto.randomBytes(32).toString('hex'))

      user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          avatarUrl,
          settings: {
            create: { ...DEFAULT_SETTINGS },
          },
          tasks: {
            create: [DEFAULT_TASK],
          },
        },
        include: { settings: true },
      })
    }

    // Обновляем аватар если его нет
    if (user && !user.avatarUrl && avatarUrl) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl },
        include: { settings: true },
      })
    }

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

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/?auth_error=server_error', request.url)
    )
  }
}
