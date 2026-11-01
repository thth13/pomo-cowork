import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { authorizeAdmin } from '@/lib/adminRequest'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }

export async function POST(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request)
    if (denied) return denied
    const body = await request.json().catch(() => null)
    if (!body || !Number.isSafeInteger(body.page) || body.page < 1
      || !['all', 'tour', 'welcome', 'chat', 'character', 'controls', 'page'].includes(body.surface)
      || (body.visitId !== null && (typeof body.visitId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.visitId)))) {
      return NextResponse.json({ error: 'Invalid event filters.' }, { status: 400, headers })
    }
    const where: Prisma.BeepEventWhereInput = {
      ...(body.surface === 'all' ? {} : { surface: body.surface }),
      ...(body.visitId ? { visitId: body.visitId } : {}),
    }
    const total = await prisma.beepEvent.count({ where })
    const pageSize = 50
    const page = Math.min(body.page, Math.max(1, Math.ceil(total / pageSize)))
    const rows = await prisma.beepEvent.findMany({
      where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize,
      select: { id: true, visitId: true, action: true, surface: true, step: true, pagePath: true, isAuthenticated: true, createdAt: true,
        user: { select: { id: true, username: true, isAnonymous: true } } },
    })
    return NextResponse.json({ rows, total, page, pageSize }, { headers })
  } catch (error) {
    console.error('Admin Beep events failed:', error)
    return NextResponse.json({ error: 'Could not load Beep activity. Please retry.' }, { status: 500, headers })
  }
}
