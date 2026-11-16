import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authorizeAdmin } from '@/lib/adminRequest'
import { conversionMetrics, defaultConversionPeriod, isCalendarDate, kyivDate } from '@/lib/conversionPeriod'

export const dynamic = 'force-dynamic'

const pageSize = 50

type ConversionRow = {
  id: string; kind: 'visitor' | 'anonymous' | 'registered'; username: string | null
  ipAddress: string | null; pagePath: string | null; referrer: string | null
  createdAt: Date; lastSeenAt: Date | null; active: boolean
}

type Counts = { newVisitors: bigint; anonymous: bigint; registered: bigint; active: bigint; pending: bigint }

export async function GET(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request)
    if (denied) return denied
    const now = new Date()
    const fallback = defaultConversionPeriod(now)
    const start = request.nextUrl.searchParams.get('start') ?? fallback.start
    const end = request.nextUrl.searchParams.get('end') ?? fallback.end
    const referrer = request.nextUrl.searchParams.get('referrer') ?? ''
    const requestedPage = Number(request.nextUrl.searchParams.get('page') ?? 1)
    if (!Number.isSafeInteger(requestedPage) || requestedPage < 1) {
      return NextResponse.json({ error: 'Choose a valid page.' }, { status: 400 })
    }
    if (!isCalendarDate(start) || !isCalendarDate(end) || start > end || end > kyivDate(now)) {
      return NextResponse.json({ error: 'Choose a valid date range ending today or earlier.' }, { status: 400 })
    }
    if (referrer.length > 500) return NextResponse.json({ error: 'Invalid referrer filter.' }, { status: 400 })

    // Current mutually exclusive records, not a historical event funnel.
    // Converted anonymous profiles keep createdAt and move into registered.
    // Resolve Kyiv midnights independently to handle DST transitions.
    const source = Prisma.sql`NULLIF(referrer, '')`
    const sourceMatch = referrer === '__none__' ? Prisma.sql`${source} IS NULL` : Prisma.sql`${source} = ${referrer}`
    const referrerFilter = referrer ? Prisma.sql`AND (
      (kind <> 'visitor' AND "createdAt" < ('2026-11-15'::date::timestamp AT TIME ZONE 'Europe/Kyiv' AT TIME ZONE 'UTC'))
      OR (${sourceMatch})
    )` : Prisma.empty
    // Metrics and detail rows use the exact same dataset and source exception.
    const filteredRecords = Prisma.sql`
      WITH records AS (
        SELECT id, 'visitor' AS kind, NULL::text AS username, "ipAddress", "pagePath",
               "createdAt", NULL::timestamp AS "lastSeenAt", details->>'referrer' AS referrer
        FROM guest_visits
        UNION ALL
        SELECT id, CASE WHEN "isAnonymous" THEN 'anonymous' ELSE 'registered' END AS kind,
               username, NULL::text AS "ipAddress", NULL::text AS "pagePath",
               "createdAt", "lastSeenAt", referrer
        FROM users
      ), filtered AS (
        SELECT * FROM records
        WHERE "createdAt" >= (${start}::date::timestamp AT TIME ZONE 'Europe/Kyiv' AT TIME ZONE 'UTC')
          AND "createdAt" < ((${end}::date + interval '1 day') AT TIME ZONE 'Europe/Kyiv' AT TIME ZONE 'UTC')
          AND "createdAt" <= ${now}
          ${referrerFilter}
      )
    `
    const result = await prisma.$transaction(async tx => {
      const [counts] = await tx.$queryRaw<Counts[]>`
        ${filteredRecords}
        SELECT COUNT(*) FILTER (WHERE kind = 'visitor') AS "newVisitors",
          COUNT(*) FILTER (WHERE kind = 'anonymous') AS anonymous,
          COUNT(*) FILTER (WHERE kind = 'registered') AS registered,
          COUNT(*) FILTER (WHERE "lastSeenAt" >= "createdAt" + interval '24 hours') AS active,
          COUNT(*) FILTER (WHERE kind <> 'visitor' AND "createdAt" > ${now}::timestamp - interval '24 hours') AS pending
        FROM filtered
      `
      const total = Number(counts.newVisitors + counts.anonymous + counts.registered)
      const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)))
      const rows = await tx.$queryRaw<ConversionRow[]>`
        ${filteredRecords}
        SELECT *, COALESCE("lastSeenAt" >= "createdAt" + interval '24 hours', false) AS active
        FROM filtered ORDER BY "createdAt" DESC, kind ASC, id DESC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
      `
      return { counts, rows, total, page }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
    const { counts, rows, total, page } = result
    const referrers = await prisma.$queryRaw<{ referrer: string }[]>`
      SELECT DISTINCT referrer FROM (
        SELECT NULLIF(details->>'referrer', '') AS referrer FROM guest_visits
        UNION ALL
        SELECT NULLIF(referrer, '') AS referrer FROM users
        WHERE "createdAt" >= ('2026-11-15'::date::timestamp AT TIME ZONE 'Europe/Kyiv' AT TIME ZONE 'UTC')
      ) sources WHERE referrer IS NOT NULL ORDER BY referrer
    `
    const newVisitors = Number(counts.newVisitors)
    const anonymous = Number(counts.anonymous)
    const registered = Number(counts.registered)
    const active = Number(counts.active)
    return NextResponse.json({
      start, end, referrer, rows, total, page, pageSize, newVisitors, anonymous, registered, active, pending: Number(counts.pending),
      ...conversionMetrics({ newVisitors, anonymous, registered, active }),
      referrers: referrers.map(row => row.referrer), updatedAt: now.toISOString(),
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Admin conversions failed:', error)
    return NextResponse.json({ error: 'Could not load conversions. Please retry.' }, { status: 500 })
  }
}
