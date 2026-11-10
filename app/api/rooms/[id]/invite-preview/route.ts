import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyRoomInviteLink } from '@/lib/roomInviteLink'

export const dynamic = 'force-dynamic'

// A valid invitation reveals only the room identity, never its private activity.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const headers = { 'Cache-Control': 'no-store' }
  try {
    const body = await request.json().catch(() => null)
    if (typeof body?.invite !== 'string' || !await verifyRoomInviteLink(body.invite, params.id)) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 403, headers })
    }
    const room = await prisma.room.findUnique({
      where: { id: params.id },
      select: { name: true, privacy: true, _count: { select: { members: true } } },
    })
    if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
    return NextResponse.json({ name: room.name, privacy: room.privacy, memberCount: room._count.members }, { headers })
  } catch {
    return NextResponse.json({ error: 'Could not load invitation' }, { status: 500, headers })
  }
}
