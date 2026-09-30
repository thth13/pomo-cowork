import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { failure, JournalError, viewer } from '@/lib/journal/server'
import { evaluateAchievements, getAchievementProfile } from '@/lib/achievements/server'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const [user, current] = await Promise.all([
      prisma.user.findFirst({ where: { id: params.userId, isAnonymous: false }, select: { id: true } }),
      viewer(request),
    ])
    if (!user) throw new JournalError('Profile not found.', 404)
    // An idempotent lazy backfill also works before the scheduled sweep reaches this user.
    const timezone = current?.id === user.id ? request.nextUrl.searchParams.get('timezone') ?? undefined : undefined
    if (timezone) {
      if (timezone.length > 100) throw new JournalError('Invalid timezone.')
      try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format() }
      catch { throw new JournalError('Invalid timezone.') }
    }
    await evaluateAchievements(user.id, timezone)
    return NextResponse.json(await getAchievementProfile(user.id, current?.id === user.id), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return failure(error) }
}
