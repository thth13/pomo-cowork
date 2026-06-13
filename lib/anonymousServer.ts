import crypto from 'crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import { buildAnonymousProfile, isValidAnonymousId } from './anonymousProfile'
import { hashPassword, verifyToken } from './auth'

const DEFAULT_SETTINGS = {
  workDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakAfter: 4,
  soundEnabled: true,
  soundVolume: 0.5,
  notificationsEnabled: true
} as const

type UserWithSettings = Prisma.UserGetPayload<{ include: { settings: true } }>

const ensureUserSettings = async (
  prisma: PrismaClient,
  user: UserWithSettings
): Promise<UserWithSettings> => {
  if (user.settings) {
    return user
  }

  await prisma.userSettings.createMany({
    data: [{
      userId: user.id,
      ...DEFAULT_SETTINGS
    }],
    skipDuplicates: true,
  })

  const settings = await prisma.userSettings.findUnique({
    where: { userId: user.id }
  })

  if (!settings) {
    throw new Error(`Failed to create settings for anonymous user ${user.id}`)
  }

  return {
    ...user,
    settings
  }
}

export const ensureAnonymousUser = async (
  prisma: PrismaClient,
  anonymousId: string
): Promise<UserWithSettings | null> => {
  if (!isValidAnonymousId(anonymousId)) {
    return null
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: anonymousId },
    include: { settings: true }
  })

  if (existingUser) {
    if (!existingUser.isAnonymous) {
      return null
    }

    return ensureUserSettings(prisma, existingUser)
  }

  const profile = buildAnonymousProfile(anonymousId)
  const randomPassword = `${anonymousId}-${crypto.randomBytes(16).toString('hex')}`
  const hashedPassword = await hashPassword(randomPassword)

  await prisma.user.createMany({
    data: [{
      id: profile.id,
      email: profile.email,
      username: profile.username,
      password: hashedPassword,
      isAnonymous: true,
    }],
    skipDuplicates: true,
  })

  const user = await prisma.user.findUnique({
    where: { id: anonymousId },
    include: { settings: true }
  })

  if (!user) {
    return null
  }

  if (!user.isAnonymous) {
    return null
  }

  return ensureUserSettings(prisma, user)
}

export const resolveExistingOrAnonymousUserId = async (
  prisma: PrismaClient,
  token: string | null,
  anonymousId?: string | null,
  options: { createAnonymous?: boolean } = {}
): Promise<string | null> => {
  if (token) {
    const payload = verifyToken(token)
    if (payload) {
      const authenticatedUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true },
      })

      if (authenticatedUser) {
        return authenticatedUser.id
      }
    }
  }

  if (!isValidAnonymousId(anonymousId)) {
    return null
  }

  if (options.createAnonymous) {
    const anonymousUser = await ensureAnonymousUser(prisma, anonymousId)
    return anonymousUser?.id ?? null
  }

  const anonymousUser = await prisma.user.findFirst({
    where: {
      id: anonymousId,
      isAnonymous: true,
    },
    select: { id: true },
  })

  return anonymousUser?.id ?? null
}
