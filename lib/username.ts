import crypto from 'crypto'
import { prisma } from '@/lib/db'

export const normalizeUsername = (value: string): string => {
  const normalized = value
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized
}

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
  const normalizedBase = normalizeUsername(base) || 'user'
  let candidate = normalizedBase
  let attempt = 1

  while (attempt <= 50) {
    const taken = await isUsernameTaken(candidate)
    if (!taken) {
      return candidate
    }

    candidate = `${normalizedBase} ${attempt}`
    attempt += 1
  }

  return `${normalizedBase} ${crypto.randomBytes(2).toString('hex')}`
}