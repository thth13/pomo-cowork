import type { Prisma } from '@prisma/client'
import { hasActiveProAccess } from '@/lib/proAccess'

const FREE_ACTIVE_HABIT_LIMIT = 2

export const habitLimitResponse = {
  error: 'Premium is required to add more active habits',
  code: 'HABIT_LIMIT_REACHED',
}

export async function lockHabitOwner(tx: Prisma.TransactionClient, userId: string) {
  // Creation and restoration share this lock so concurrent requests cannot
  // both claim the last free slot. Always acquire it before locking a habit.
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`
}

export async function canActivateHabit(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { isPro: true, proExpiresAt: true },
  })
  if (hasActiveProAccess(user)) return true
  return await tx.habit.count({ where: { userId, archived: false } }) < FREE_ACTIVE_HABIT_LIMIT
}
