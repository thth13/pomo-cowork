import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { previousMonthStart, validMonth, type MonthlyWrapped } from '@/lib/wrapped/analytics'
import { getMonthlyWrapped } from '@/lib/wrapped/server'

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
    const latest = previousMonthStart(timezone)
    const month = request.nextUrl.searchParams.get('month') || latest
    if (!validMonth(month) || month > latest || month < '2020-01-01') return json({ error: 'Invalid completed month' }, 400)
    const report = await getMonthlyWrapped(user.id, month, timezone)
    const saved = await prisma.$transaction(async tx => {
      // Serialize inbox creation with view acknowledgments, including other tabs.
      await tx.$queryRaw`SELECT "userId" FROM "monthly_wrapped" WHERE "userId" = ${user.id} AND "monthStart" = ${month} FOR UPDATE`
      const row = await tx.monthlyWrapped.findUniqueOrThrow({ where: { userId_monthStart: { userId: user.id, monthStart: month } } })
      if (month === latest && report.totalFocusMinutes > 0 && !row.viewedAt) {
        await tx.notification.upsert({
          where: { id: `monthly-wrapped:${user.id}:${month}` }, update: {},
          create: { id: `monthly-wrapped:${user.id}:${month}`, userId: user.id, type: 'MONTHLY_WRAPPED', wrappedMonth: month, title: 'Monthly Wrapped', message: 'Your monthly recap is ready.' },
        })
      }
      return row
    })
    const history = await prisma.monthlyWrapped.findMany({ where: { userId: user.id }, orderBy: { monthStart: 'desc' }, select: { monthStart: true, snapshot: true } })
    return json({ report, pending: !saved.viewedAt && !saved.notifiedAt, history: history.filter(row => (row.snapshot as unknown as MonthlyWrapped).totalFocusMinutes > 0).map(row => ({ monthStart: row.monthStart, monthEnd: (row.snapshot as unknown as MonthlyWrapped).monthEnd })) })
  } catch (error) {
    console.error('Monthly Wrapped:', error)
    return json({ error: 'Unable to load recap' }, 500)
  }
}
// Toast delivery and actual viewing are separate, account-scoped states.
export async function POST(request: NextRequest) {
  try {
    const user = await identity(request)
    if (!user) return json({ error: 'Unauthorized' }, 401)
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || !('monthStart' in body) || typeof body.monthStart !== 'string' || !validMonth(body.monthStart)) return json({ error: 'Invalid month' }, 400)
    const row = await prisma.monthlyWrapped.findUnique({ where: { userId_monthStart: { userId: user.id, monthStart: body.monthStart } } })
    if (!row || (row.snapshot as unknown as MonthlyWrapped).totalFocusMinutes <= 0) return json({ claimed: false })
    // Temporary debug action: reset only the authenticated user's recap.
    if ('action' in body && body.action === 'reset-notification') {
      await prisma.$transaction([
        prisma.monthlyWrapped.update({ where: { userId_monthStart: { userId: user.id, monthStart: row.monthStart } }, data: { notifiedAt: null, viewedAt: null } }),
        prisma.notification.updateMany({ where: { userId: user.id, type: 'MONTHLY_WRAPPED', wrappedMonth: row.monthStart }, data: { readAt: null } }),
      ])
      return json({ reset: true })
    }
    if ('action' in body && body.action === 'notify') {
      if (row.monthStart !== previousMonthStart(row.timezone)) return json({ claimed: false })
      const result = await prisma.monthlyWrapped.updateMany({ where: { userId: user.id, monthStart: row.monthStart, viewedAt: null, notifiedAt: null }, data: { notifiedAt: new Date() } })
      return json({ claimed: result.count === 1 })
    }
    await prisma.$transaction([
      prisma.monthlyWrapped.updateMany({ where: { userId: user.id, monthStart: row.monthStart, viewedAt: null }, data: { viewedAt: new Date() } }),
      prisma.notification.updateMany({ where: { userId: user.id, type: 'MONTHLY_WRAPPED', wrappedMonth: row.monthStart, readAt: null }, data: { readAt: new Date() } }),
    ])
    return json({ viewed: true })
  } catch { return json({ error: 'Unable to save viewed state' }, 500) }
}
