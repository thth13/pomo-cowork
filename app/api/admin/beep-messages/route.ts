import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { authorizeAdmin } from '@/lib/adminRequest'
import { isBeepId } from '@/lib/beepConversations'

export const dynamic = 'force-dynamic'
const pageSize = 50
const headers = { 'Cache-Control': 'private, no-store' }

// Read-only POST follows the other admin lists and keeps account filters out of request URLs.
export async function POST(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request)
    if (denied) return denied
    const body = await request.json().catch(() => null)
    if (!body || !Number.isSafeInteger(body.page) || body.page < 1
      || !['all', 'completed', 'pending', 'interrupted', 'failed'].includes(body.status)
      || (body.conversationId !== null && !isBeepId(body.conversationId))) {
      return NextResponse.json({ error: 'Invalid page, status or conversation.' }, { status: 400, headers })
    }
    const where: Prisma.BeepTurnWhereInput = {
      ...(body.status === 'all' ? {} : { status: body.status }),
      ...(body.conversationId ? { conversationId: body.conversationId } : {}),
    }
    const total = await prisma.beepTurn.count({ where })
    const page = Math.min(body.page, Math.max(1, Math.ceil(total / pageSize)))
    const rows = await prisma.beepTurn.findMany({
      where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: body.conversationId ? [{ sequence: 'asc' }] : [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true, sequence: true, userText: true, assistantText: true, status: true, createdAt: true,
        conversation: { select: {
          id: true, title: true, greeting: true, createdAt: true, updatedAt: true, revision: true,
          activeRequestId: true, activeUntil: true,
          user: { select: { id: true, username: true, email: true, isAnonymous: true } },
          _count: { select: { turns: true } },
        } },
      },
    })
    return NextResponse.json({ rows, total, page, pageSize }, { headers })
  } catch (error) {
    console.error('Admin Beep messages failed:', error)
    return NextResponse.json({ error: 'Could not load Beep messages. Please retry.' }, { status: 500, headers })
  }
}
