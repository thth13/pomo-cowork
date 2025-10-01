import crypto from 'crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import { buildAnonymousProfile } from './anonymousProfile'
import { hashPassword } from './auth'

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

export const ensureAnonymousUser = async (
  prisma: PrismaClient,
  anonymousId: string
): Promise<UserWithSettings> => {
  const existingUser = await prisma.user.findUnique({
    where: { id: anonymousId },
    include: { settings: true }
  })

  if (existingUser) {
    if (!existingUser.settings) {
      const settings = await prisma.userSettings.create({
        data: {
          userId: existingUser.id,
          ...DEFAULT_SETTINGS
        }
      })

      return {
        ...existingUser,
        settings
      }
    }

    return existingUser
  }

  const profile = buildAnonymousProfile(anonymousId)
  const randomPassword = `${anonymousId}-${crypto.randomBytes(16).toString('hex')}`
  const hashedPassword = await hashPassword(randomPassword)

  const user = await prisma.user.create({
    data: {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      password: hashedPassword,
      isAnonymous: true,
      settings: {
        create: {
          ...DEFAULT_SETTINGS
        }
      }
    },
    include: {
      settings: true
    }
  })

  return user
}

