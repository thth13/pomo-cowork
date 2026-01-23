import { prisma } from '@/lib/db'

export const normalizeReferralCode = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^[a-zA-Z0-9_-]{4,32}$/.test(trimmed)) return null
  return trimmed
}

export const recordReferralSignup = async (code: unknown, userId: string): Promise<boolean> => {
  const normalized = normalizeReferralCode(code)
  if (!normalized) return false

  const referral = await prisma.referralLink.findUnique({
    where: { code: normalized },
    select: { id: true },
  })

  if (!referral) return false

  await prisma.referralSignup.upsert({
    where: {
      referralId_userId: {
        referralId: referral.id,
        userId,
      },
    },
    update: {},
    create: {
      referralId: referral.id,
      userId,
    },
  })

  return true
}
