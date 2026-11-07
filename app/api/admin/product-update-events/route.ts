import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdmin } from '@/lib/adminRequest'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }

export async function GET(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request)
    if (denied) return denied
    const requestedPage = Number(request.nextUrl.searchParams.get('page') ?? 1)
    if (!Number.isSafeInteger(requestedPage) || requestedPage < 1) return NextResponse.json({ error: 'Invalid page.' }, { status: 400, headers })
    const total = await prisma.productUpdateEvent.count()
    const pageSize = 50
    const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)))
    const rows = await prisma.productUpdateEvent.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize,
      select: { id: true, productUpdateId: true, action: true, createdAt: true,
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isAnonymous: true } } },
    })
    return NextResponse.json({ rows, total, page, pageSize }, { headers })
  } catch (error) {
    console.error('Admin product update events failed:', error)
    return NextResponse.json({ error: 'Could not load update activity. Please retry.' }, { status: 500, headers })
  }
}
