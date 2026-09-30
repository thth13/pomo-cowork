import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { body, failure, JournalError, requireUser } from '@/lib/journal/server'

/** Claim only when display is safe. UPDATE ... RETURNING prevents duplicate
 * notifications from concurrent tabs; unclaimed unlocks survive reloads. */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request), data = await body(request)
    const ids = data.ids
    if (!Array.isArray(ids) || ids.length > 100 || ids.some(id => typeof id !== 'string' || id.length > 80)) throw new JournalError('Invalid achievements.')
    const claimed = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1::int FROM pg_advisory_xact_lock(hashtext(${user.id}))`
      const focusing = await tx.pomodoroSession.findFirst({
        where: { userId: user.id, type: { in: ['WORK', 'TIME_TRACKING'] }, status: { in: ['ACTIVE', 'PAUSED'] } },
        select: { id: true },
      })
      if (focusing || !ids.length) return []
      const rows = await tx.$queryRaw<{ achievementId: string }[]>(Prisma.sql`
        UPDATE "user_achievements" SET "notifiedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = ${user.id} AND "notifiedAt" IS NULL AND "achievementId" IN (${Prisma.join(ids as string[])})
        RETURNING "achievementId"
      `)
      return rows.map(row => row.achievementId)
    })
    return NextResponse.json({ claimed })
  } catch (error) { return failure(error) }
}
