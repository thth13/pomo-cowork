import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdmin } from '@/lib/adminRequest'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request)
    if (denied) return denied

    const month = request.nextUrl.searchParams.get('month') ?? 'all'
    if (month !== 'all' && !/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return NextResponse.json({ error: 'Choose a valid month (YYYY-MM) or all time.' }, { status: 400 })
    }

    // Resolve both local month boundaries independently, including DST changes.
    // User DateTime columns store UTC timestamps without a time zone.
    const period = month === 'all' ? Prisma.empty : Prisma.sql`
      AND "createdAt" >= (${`${month}-01`}::date::timestamp AT TIME ZONE 'Europe/Kyiv' AT TIME ZONE 'UTC')
      AND "createdAt" < ((${`${month}-01`}::date + interval '1 month') AT TIME ZONE 'Europe/Kyiv' AT TIME ZONE 'UTC')
    `
    const now = new Date()
    const [counts] = await prisma.$queryRaw<{ registered: bigint; anonymous: bigint }[]>`
      SELECT count(*) FILTER (WHERE "isAnonymous" = false) AS registered,
             count(*) FILTER (WHERE "isAnonymous" = true) AS anonymous
      FROM users
      WHERE "createdAt" <= ${now} ${period}
    `
    const registered = Number(counts.registered)
    const anonymous = Number(counts.anonymous)

    return NextResponse.json({ month, registered, anonymous, total: registered + anonymous, updatedAt: now.toISOString() }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('Admin user counts failed:', error)
    return NextResponse.json({ error: 'Could not load user counts. Please retry.' }, { status: 500 })
  }
}
