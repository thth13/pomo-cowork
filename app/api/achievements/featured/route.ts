import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { body, failure, JournalError, requireUser } from '@/lib/journal/server'
import { ENABLED_ACHIEVEMENTS } from '@/lib/achievements/definitions'
export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser(request), data = await body(request)
    const ids = data.ids
    if (!Array.isArray(ids) || ids.length > 3 || ids.some(id => typeof id !== 'string' || !ENABLED_ACHIEVEMENTS.some(d => d.id === id)) || new Set(ids).size !== ids.length) {
      throw new JournalError('Select up to three different unlocked achievements.')
    }
    const selection = ids as string[]
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1::int FROM pg_advisory_xact_lock(hashtext(${'achievements:' + user.id}))`
      if (selection.length) {
        const unlocked = await tx.$queryRaw<{ achievementId: string }[]>(Prisma.sql`
          SELECT "achievementId" FROM "user_achievements" WHERE "userId" = ${user.id}
          AND "achievementId" IN (${Prisma.join(selection)})
        `)
        if (unlocked.length !== selection.length) throw new JournalError('Only unlocked achievements can be featured.')
      }
      await tx.$executeRaw`UPDATE "user_achievements" SET "featuredOrder" = NULL WHERE "userId" = ${user.id} AND "featuredOrder" IS NOT NULL`
      for (let index = 0; index < selection.length; index++) {
        const id = selection[index]
        await tx.$executeRaw`UPDATE "user_achievements" SET "featuredOrder" = ${index} WHERE "userId" = ${user.id} AND "achievementId" = ${id}`
      }
    })
    return NextResponse.json({ ids: selection })
  } catch (error) { return failure(error) }
}
