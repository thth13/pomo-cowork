import type { Prisma, PrismaClient } from '@prisma/client'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { isValidAnonymousId } from '@/lib/anonymousProfile'

export const VISITOR_COOKIE = 'pomo_visitor'

// Tracking and conversion share a lock, including when no visit has been inserted yet.
export async function lockVisitor(tx: Prisma.TransactionClient, id: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`
}

export async function consumeVisitor(tx: Prisma.TransactionClient, id: string) {
  await tx.visitorIdentity.upsert({
    where: { id }, create: { id, converted: true }, update: { converted: true },
  })
  await tx.guestVisit.deleteMany({ where: { id } })
}

export async function removeGuestVisit(id: string, db: PrismaClient = prisma): Promise<void> {
  if (!isValidAnonymousId(id)) return
  try {
    await db.$transaction(async tx => {
      await lockVisitor(tx, id)
      await consumeVisitor(tx, id)
    })
  } catch (error) {
    // Analytics must never prevent account creation or starting the timer.
    console.error('Failed to remove guest visit:', error)
  }
}

export async function removeRequestGuestVisit(request: NextRequest, anonymousId?: unknown): Promise<void> {
  const ids = new Set([request.cookies.get(VISITOR_COOKIE)?.value, anonymousId])
  for (const id of ids) {
    if (isValidAnonymousId(id)) await removeGuestVisit(id)
  }
}
