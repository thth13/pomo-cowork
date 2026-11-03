import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authorizeAdmin } from '@/lib/adminRequest'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }

export async function GET(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request)
    if (denied) return denied
    const days = Number(request.nextUrl.searchParams.get('days') ?? 7)
    const requestedPage = Number(request.nextUrl.searchParams.get('page') ?? 1)
    if (![7, 30].includes(days) || !Number.isSafeInteger(requestedPage) || requestedPage < 1) {
      return NextResponse.json({ error: 'Invalid activity filters.' }, { status: 400, headers })
    }
    const now = new Date()
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const where = { isAnonymous: false, lastSeenAt: { gte: since, lte: now } }
    const total = await prisma.user.count({ where })
    const pageSize = 20
    const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)))
    const rows = await prisma.user.findMany({
      where, orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize, take: pageSize,
      select: { id: true, username: true, isAnonymous: true, lastSeenAt: true },
    })
    return NextResponse.json({ rows, total, page, pageSize }, { headers })
  } catch (error) {
    console.error('Admin recent users failed:', error)
    return NextResponse.json({ error: 'Could not load recent users. Please retry.' }, { status: 500, headers })
  }
}
