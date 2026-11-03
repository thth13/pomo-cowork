import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdmin } from '@/lib/adminRequest'
import { isValidAnonymousId } from '@/lib/anonymousProfile'
import { prisma } from '@/lib/db'
import { consumeVisitor, lockVisitor } from '@/lib/guestVisits'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request)
    if (denied) return denied
    const id = request.nextUrl.searchParams.get('id')
    if (!isValidAnonymousId(id) || id.length > 128) {
      return NextResponse.json({ error: 'A valid visitor ID is required.' }, { status: 400 })
    }
    // Idempotent; the retained identity prevents reloads and in-flight tracking
    // requests from recreating the deleted visit and its metadata.
    await prisma.$transaction(async tx => {
      await lockVisitor(tx, id)
      await consumeVisitor(tx, id)
    })
    return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Admin visitor deletion failed:', error)
    return NextResponse.json({ error: 'Could not delete visit. Please retry.' }, { status: 500 })
  }
}
