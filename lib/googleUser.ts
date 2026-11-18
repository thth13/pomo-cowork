import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { registerAnonymousUser } from '@/lib/registerAnonymousUser'
import { generateUniqueUsername } from '@/lib/username'

const DEFAULT_SETTINGS = {
  workDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakAfter: 4,
  soundEnabled: true,
  soundVolume: 0.5,
  notificationsEnabled: true,
} as const

export async function resolveGoogleUser(
  profile: { email: string; name?: string; picture?: string },
  anonymousId: string | null,
) {
  const email = profile.email.toLowerCase()
  let user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } }, include: { settings: true },
  })
  let convertedAnonymousId: string | null = null
  if (!user) {
    const data = {
      email,
      username: await generateUniqueUsername(profile.name || email.split('@')[0]),
      password: await hashPassword(crypto.randomBytes(32).toString('hex')),
      avatarUrl: profile.picture,
    }
    const guest = anonymousId && await prisma.user.findFirst({
      where: { id: anonymousId, isAnonymous: true }, select: { id: true },
    })
    if (guest) {
      user = await registerAnonymousUser(guest.id, data)
      convertedAnonymousId = guest.id
    } else {
      user = await prisma.user.create({
        data: { ...data, settings: { create: DEFAULT_SETTINGS } }, include: { settings: true },
      })
    }
  }

  if (!user.settings) {
    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id }, create: { userId: user.id, ...DEFAULT_SETTINGS }, update: {},
    })
    user = { ...user, settings }
  }
  if (!user.avatarUrl && profile.picture) {
    user = await prisma.user.update({
      where: { id: user.id }, data: { avatarUrl: profile.picture }, include: { settings: true },
    })
  }
  return { user, convertedAnonymousId }
}
