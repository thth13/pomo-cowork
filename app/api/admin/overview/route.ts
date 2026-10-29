import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authorizeAdmin } from '@/lib/adminRequest'

export const dynamic = 'force-dynamic'

const kyivParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const value = (key: string) => Number(parts.find(part => part.type === key)?.value)
  return { year: value('year'), month: value('month'), day: value('day'), hour: value('hour'), minute: value('minute'), second: value('second') }
}

// Resolve each calendar boundary independently, including months spanning DST.
function kyivMidnight(year: number, month: number, day: number) {
  const wallTime = Date.UTC(year, month - 1, day)
  let candidate = wallTime
  for (let attempt = 0; attempt < 3; attempt++) {
    const local = kyivParts(new Date(candidate))
    candidate += wallTime - Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second)
  }
  return new Date(candidate)
}

export async function GET(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request)
    if (denied) return denied
    const now = new Date()
    const local = kyivParts(now)
    const dayStart = kyivMidnight(local.year, local.month, local.day)
    const monthStart = kyivMidnight(local.year, local.month, 1)
    const [todayRegistered, todayAnonymous, monthlyRegistered, todayStartedTimers, paywallActions, habits, activeHabits, wallMessages] = await Promise.all([
      prisma.user.count({ where: { isAnonymous: false, createdAt: { gte: dayStart, lte: now } } }),
      prisma.user.count({ where: { isAnonymous: true, createdAt: { gte: dayStart, lte: now } } }),
      prisma.user.count({ where: { isAnonymous: false, createdAt: { gte: monthStart, lte: now } } }),
      prisma.pomodoroSession.count({ where: { startedAt: { gte: dayStart, lte: now } } }),
      prisma.paywallEvent.count(),
      prisma.habit.count(),
      prisma.habit.count({ where: { archived: false } }),
      prisma.userWallMessage.count(),
    ])
    return NextResponse.json({ todayRegistered, todayAnonymous, monthlyRegistered, todayStartedTimers, paywallActions, habits, activeHabits, wallMessages, updatedAt: now.toISOString() }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Admin overview failed:', error)
    return NextResponse.json({ error: 'Could not load overview. Please retry.' }, { status: 500 })
  }
}
