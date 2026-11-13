import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdmin } from '@/lib/adminRequest'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
export async function GET(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request)
    if (denied) return denied
    const requested = Number(request.nextUrl.searchParams.get('page') ?? 1)
    if (!Number.isSafeInteger(requested) || requested < 1) return NextResponse.json({ error: 'Invalid page.' }, { status: 400, headers })
    const total = await prisma.settingsChange.count()
    const pageSize = 50
    const page = Math.min(requested, Math.max(1, Math.ceil(total / pageSize)))
    const rows = await prisma.settingsChange.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize,
      select: { id: true, field: true, previousValue: true, nextValue: true, createdAt: true,
        user: { select: { id: true, username: true, displayName: true } } },
    })
    return NextResponse.json({ rows, total, page, pageSize }, { headers })
  } catch (error) {
    console.error('Settings change log failed:', error)
    return NextResponse.json({ error: 'Could not load settings changes. Please retry.' }, { status: 500, headers })
  }
}
