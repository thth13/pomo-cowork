import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { canInviteToRoom, createRoomInviteLinkToken } from '@/lib/roomInviteLink'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'))
    const payload = token ? verifyToken(token) : null
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!await canInviteToRoom(params.id, payload.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const invite = createRoomInviteLinkToken(params.id, payload.userId)
    return NextResponse.json({ path: `/rooms/${params.id}?join=1&invite=${encodeURIComponent(invite)}` }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Create room invite link error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
