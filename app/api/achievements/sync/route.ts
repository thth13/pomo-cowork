import { NextRequest, NextResponse } from 'next/server'
import { body, failure, JournalError, requireUser } from '@/lib/journal/server'
import { evaluateAchievements, getAchievementProfile } from '@/lib/achievements/server'
import { refreshAchievementLeaderboard } from '@/lib/achievements/leaderboard'
import { prisma } from '@/lib/db'
export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request)
    const data = await body(request)
    const timezone = data.timezone
    if (typeof timezone !== 'string' || timezone.length > 100) throw new JournalError('Invalid timezone.')
    try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format() }
    catch { throw new JournalError('Invalid timezone.') }
    await evaluateAchievements(user.id, timezone)
    try { await refreshAchievementLeaderboard() }
    catch (error) { console.error('Achievement leaderboard refresh will retry:', error) }
    const pending = await prisma.$queryRaw<{ achievementId: string }[]>`
      SELECT "achievementId" FROM "user_achievements" WHERE "userId" = ${user.id} AND "notifiedAt" IS NULL ORDER BY "unlockedAt", "achievementId"
    `
    const focusing = !!await prisma.pomodoroSession.findFirst({
      where: { userId: user.id, type: { in: ['WORK', 'TIME_TRACKING'] }, status: { in: ['ACTIVE', 'PAUSED'] } },
      select: { id: true },
    })
    const profile = await getAchievementProfile(user.id, true)
    return NextResponse.json({ profile, focusing, pending: pending.map(row => row.achievementId) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return failure(error) }
}
