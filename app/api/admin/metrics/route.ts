import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authorizeAdmin } from '@/lib/adminRequest'

export const dynamic = 'force-dynamic'
type RecordRow = { metric: string; period: string; count: bigint }

export async function GET(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request)
    if (denied) return denied
    const now = new Date()
    // Prisma DateTime columns are UTC timestamps without a time zone.
    // Group in Kyiv local calendar time, not the database session's time zone.
    const [totalRegistered, registrations, timers] = await Promise.all([
      prisma.user.count({ where: { isAnonymous: false } }),
      prisma.$queryRaw<RecordRow[]>`
        WITH daily AS (
          SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Kyiv', 'YYYY-MM-DD') AS period,
                 count(*) AS count
          FROM users WHERE "isAnonymous" = false AND "createdAt" <= ${now}
          GROUP BY 1
        ), monthly AS (
          SELECT left(period, 7) AS period, sum(count)::bigint AS count FROM daily GROUP BY 1
        )
        (SELECT 'registrationDay' AS metric, period, count FROM daily ORDER BY count DESC, period DESC LIMIT 1)
        UNION ALL
        (SELECT 'registrationMonth' AS metric, period, count FROM monthly ORDER BY count DESC, period DESC LIMIT 1)
      `,
      prisma.$queryRaw<RecordRow[]>`
        WITH daily AS (
          SELECT to_char("startedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Kyiv', 'YYYY-MM-DD') AS period,
                 count(*) AS starts, count(DISTINCT "userId") AS people
          FROM pomodoro_sessions WHERE "startedAt" <= ${now}
          GROUP BY 1
        )
        (SELECT 'timerDay' AS metric, period, starts AS count FROM daily ORDER BY starts DESC, period DESC LIMIT 1)
        UNION ALL
        (SELECT 'timerUsersDay' AS metric, period, people AS count FROM daily ORDER BY people DESC, period DESC LIMIT 1)
      `,
    ])
    const records = [...registrations, ...timers]
    const record = (metric: string) => {
      const entry = records.find(row => row.metric === metric)
      return entry ? { period: entry.period, count: Number(entry.count) } : null
    }
    return NextResponse.json({ totalRegistered, registrationMonth: record('registrationMonth'), registrationDay: record('registrationDay'), timerDay: record('timerDay'), timerUsersDay: record('timerUsersDay'), updatedAt: now.toISOString() }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Admin metrics failed:', error)
    return NextResponse.json({ error: 'Could not load metrics. Please retry.' }, { status: 500 })
  }
}
