import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface LastSeenPayload {
  lastSeenAt?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id

    const payload = (await request.json().catch(() => ({}))) as LastSeenPayload
    const lastSeenAt = payload.lastSeenAt ? new Date(payload.lastSeenAt) : new Date()

    if (Number.isNaN(lastSeenAt.getTime())) {
      return NextResponse.json({ error: 'Invalid lastSeenAt' }, { status: 400 })
    }

    // Visitors may not have a persisted profile yet. Presence must not create one.
    const result = await prisma.user.updateMany({
      where: { id: userId },
      data: { lastSeenAt }
    })

    return NextResponse.json({ success: true, lastSeenAt: result.count > 0 ? lastSeenAt : null })
  } catch (error) {
    console.error('Error updating lastSeenAt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
