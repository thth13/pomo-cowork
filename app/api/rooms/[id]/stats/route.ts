import { NextRequest, NextResponse } from 'next/server'
import { getRoomAccess } from '@/lib/rooms/access'
import { getRoomEngagementStats } from '@/lib/rooms/stats'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { room, userId } = await getRoomAccess(params.id, request.headers.get('authorization'))
    if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const stats = await getRoomEngagementStats(room.id, userId)
    if (!stats) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(stats, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Room stats error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
