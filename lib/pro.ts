import { prisma } from '@/lib/db'

interface ProState {
  id: string
  isPro: boolean
  proExpiresAt: Date | string | null
}

export function hasActiveProAccess(user: Pick<ProState, 'isPro' | 'proExpiresAt'>): boolean {
  if (!user.isPro) {
    return false
  }

  if (!user.proExpiresAt) {
    return true
  }

  return new Date(user.proExpiresAt) > new Date()
}

export async function syncExpiredProStatus<T extends ProState>(user: T): Promise<T> {
  if (hasActiveProAccess(user)) {
    return user
  }

  if (!user.isPro) {
    return {
      ...user,
      isPro: false,
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isPro: false },
  })

  return {
    ...user,
    isPro: false,
  }
}