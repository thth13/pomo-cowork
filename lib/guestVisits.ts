import type { Prisma, PrismaClient } from '@prisma/client'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { isValidAnonymousId } from '@/lib/anonymousProfile'
import { sanitizeVisitorReferrer } from '@/lib/visitorDetails'

export const VISITOR_COOKIE = 'pomo_visitor'

// Tracking and conversion share a lock, including when no visit has been inserted yet.
export async function lockVisitor(tx: Prisma.TransactionClient, id: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`
}

// Copy attribution before deleting the visitor row. The identity link also lets
// a delayed initial tracking request fill attribution after account creation.
export async function consumeVisitor(tx: Prisma.TransactionClient, id: string, userId?: string, incomingReferrer?: string | null) {
  const [identity, visit, anonymousUser] = await Promise.all([
    tx.visitorIdentity.findUnique({ where: { id } }),
    tx.guestVisit.findUnique({ where: { id }, select: { details: true } }),
    tx.user.findUnique({ where: { id }, select: { id: true, referrer: true, isAnonymous: true } }),
  ])
  const targetId = userId ?? identity?.userId ?? anonymousUser?.id
  const details = visit?.details
  const savedReferrer = details && typeof details === 'object' && !Array.isArray(details)
    ? sanitizeVisitorReferrer(details.referrer) : null
  const source = savedReferrer ?? (anonymousUser?.isAnonymous ? anonymousUser.referrer : null) ?? incomingReferrer
  if (targetId && source) {
    // First known source wins; reloads, login and later visits cannot replace it.
    await tx.user.updateMany({ where: { id: targetId, referrer: null }, data: { referrer: source } })
  }
  await tx.visitorIdentity.upsert({
    where: { id },
    create: { id, converted: true, userId: targetId },
    update: { converted: true, ...(targetId ? { userId: targetId } : {}) },
  })
  await tx.guestVisit.deleteMany({ where: { id } })
}

export async function removeGuestVisit(id: string, db: PrismaClient = prisma, userId?: string): Promise<void> {
  if (!isValidAnonymousId(id)) return
  try {
    await db.$transaction(async tx => {
      await lockVisitor(tx, id)
      await consumeVisitor(tx, id, userId)
    })
  } catch (error) {
    // Analytics must never prevent account creation or starting the timer.
    console.error('Failed to remove guest visit:', error)
  }
}

export async function removeRequestGuestVisit(request: NextRequest, anonymousId?: unknown, userId?: string): Promise<void> {
  const ids = Array.from(new Set([request.cookies.get(VISITOR_COOKIE)?.value, anonymousId]))
  for (const id of ids) {
    if (isValidAnonymousId(id)) await removeGuestVisit(id, prisma, userId)
  }
}
