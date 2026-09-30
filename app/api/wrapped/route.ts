import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { previousMonday, validWeek, type WeeklyWrapped } from '@/lib/wrapped/analytics'
import { getWeeklyWrapped } from '@/lib/wrapped/server'

export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
async function identity(request: NextRequest) {
  const token = getTokenFromHeader(request.headers.get('authorization'))
  const payload = token ? verifyToken(token) : null
  if (!payload) return null
  return prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } })
}
export async function GET(request: NextRequest) {
  try {
    const user = await identity(request)
    if (!user) return json({ error: 'Unauthorized' }, 401)
    const timezone = request.nextUrl.searchParams.get('timezone') || 'UTC'
    try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format() }
    catch { return json({ error: 'Invalid timezone' }, 400) }
    const latest = previousMonday(timezone)
    const week = request.nextUrl.searchParams.get('week') || latest
    if (!validWeek(week) || week > latest || week < '2020-01-06') return json({ error: 'Invalid completed week' }, 400)
    const report = await getWeeklyWrapped(user.id, week, timezone)
    const history = await prisma.weeklyWrapped.findMany({ where: { userId: user.id }, orderBy: { weekStart: 'desc' }, select: { weekStart: true, snapshot: true } })
    return json({ report, history: history.filter(row => (row.snapshot as unknown as WeeklyWrapped).totalFocusMinutes > 0).map(row => ({ weekStart: row.weekStart, weekEnd: (row.snapshot as unknown as WeeklyWrapped).weekEnd })) })
  } catch (error) {
    console.error('Weekly Wrapped:', error)
    return json({ error: 'Unable to load recap' }, 500)
  }
}
// Atomic compare-and-set prevents automatic replay across tabs and devices.
export async function POST(request: NextRequest) {
  try {
    const user = await identity(request)
    if (!user) return json({ error: 'Unauthorized' }, 401)
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || !('weekStart' in body) || typeof body.weekStart !== 'string' || !validWeek(body.weekStart)) return json({ error: 'Invalid week' }, 400)
    const row = await prisma.weeklyWrapped.findUnique({ where: { userId_weekStart: { userId: user.id, weekStart: body.weekStart } } })
    if (!row || row.weekStart !== previousMonday(row.timezone) || (row.snapshot as unknown as WeeklyWrapped).totalFocusMinutes <= 0) return json({ claimed: false })
    const result = await prisma.weeklyWrapped.updateMany({ where: { userId: user.id, weekStart: row.weekStart, viewedAt: null }, data: { viewedAt: new Date() } })
    return json({ claimed: result.count === 1 })
  } catch { return json({ error: 'Unable to save viewed state' }, 500) }
}
