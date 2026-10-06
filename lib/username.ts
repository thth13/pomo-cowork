import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { validUsername, slugify } from '@/lib/journal/validation'

import { normalizeRegistrationUsername } from '@/lib/registrationValidation'

export const normalizeUsername = normalizeRegistrationUsername

export const sanitizeUsername = normalizeUsername

export const isUsernameTaken = async (username: string, excludeUserId?: string): Promise<boolean> => {
  const existing = await prisma.user.findFirst({
    where: {
      username: { equals: username, mode: 'insensitive' },
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
    },
    select: { id: true },
  })

  return Boolean(existing)
}

export const generateUniqueUsername = async (base: string): Promise<string> => {
  const candidateBase = slugify(base).slice(0,22)
  const normalizedBase = validUsername(candidateBase) ? candidateBase : `user-${crypto.randomBytes(3).toString('hex')}`
  let candidate = normalizedBase
  let attempt = 1

  while (attempt <= 50) {
    const taken = await isUsernameTaken(candidate)
    if (!taken) {
      return candidate
    }

    candidate = `${normalizedBase}-${attempt}`
    attempt += 1
  }

  return `${normalizedBase}-${crypto.randomBytes(2).toString('hex')}`
}