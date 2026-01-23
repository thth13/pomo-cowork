import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { generateToken, hashPassword } from '@/lib/auth'
import { recordReferralSignup } from '@/lib/referrals'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

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

const buildUserPayload = (user: UserWithSettings) => {
  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

export async function POST(request: NextRequest) {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json({ error: 'Google OAuth is not configured' }, { status: 500 })
    }

    const { token, anonymousId, referralCode } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Google token is required' }, { status: 400 })
    }

    const payload = await verifyGoogleToken(token)
    if (!payload || !payload.email) {
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 })
    }

    const email = payload.email.toLowerCase()
    const displayName = payload.name || email.split('@')[0]
    const avatarUrl = payload.picture

    let user = await prisma.user.findUnique({ where: { email }, include: { settings: true } })

    if (user && !user.settings) {
      const settings = await prisma.userSettings.create({
        data: { userId: user.id, ...DEFAULT_SETTINGS },
      })

      user = { ...user, settings }
    }

    // Upgrade anonymous user if provided and the email does not exist yet
    if (!user && anonymousId) {
      const anonymousUser = await prisma.user.findUnique({ where: { id: anonymousId }, include: { settings: true } })

      if (anonymousUser && anonymousUser.isAnonymous) {
        const username = await generateUniqueUsername(displayName)
        const hashedPassword = await hashPassword(crypto.randomBytes(32).toString('hex'))

        user = await prisma.user.update({
          where: { id: anonymousId },
          data: {
            email,
            username,
            password: hashedPassword,
            isAnonymous: false,
            avatarUrl,
          },
          include: { settings: true },
        })

        if (!user.settings) {
          const settings = await prisma.userSettings.create({
            data: { userId: user.id, ...DEFAULT_SETTINGS },
          })

          user = { ...user, settings }
        }
      }
    }

    // Create user if not exists
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

    // Update avatar for existing user if it is missing
    if (user && !user.avatarUrl && avatarUrl) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl },
        include: { settings: true },
      })
    }

    await recordReferralSignup(referralCode, user.id)

    const jwtToken = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    })

    return NextResponse.json({
      user: buildUserPayload(user),
      token: jwtToken,
    })
  } catch (error) {
    console.error('Google auth error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
