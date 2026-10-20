import { prisma } from '@/lib/db'
import { hasActiveProAccess } from '@/lib/proAccess'

export { hasActiveProAccess } from '@/lib/proAccess'

interface ProState {
  id: string
  isPro: boolean
  proExpiresAt: Date | string | null
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
