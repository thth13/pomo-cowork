import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { isAdminUser } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'))
    const payload = token ? verifyToken(token) : null
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true },
    })
    if (!admin || !isAdminUser(admin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const id = request.nextUrl.searchParams.get('id')?.trim()
    if (!id) return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })

    // Idempotent when another administrator has already removed this event.
    await prisma.paywallEvent.deleteMany({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Delete paywall event error:', error)
    return NextResponse.json({ error: 'Could not delete event' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'))
    const payload = token ? verifyToken(token) : null
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true },
    })
    if (!admin || !isAdminUser(admin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const requestedPage = Number(request.nextUrl.searchParams.get('page') ?? 1)
    if (!Number.isSafeInteger(requestedPage) || requestedPage < 1) {
      return NextResponse.json({ error: 'Invalid page' }, { status: 400 })
    }

    const pageSize = 50
    const total = await prisma.paywallEvent.count()
    const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)))
    const events = await prisma.paywallEvent.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        event: true,
        plan: true,
        pagePath: true,
        isAuthenticated: true,
        userId: true,
        createdAt: true,
        user: { select: { id: true, username: true, email: true, isAnonymous: true } },
      },
    })

    return NextResponse.json({ events, page, pageSize, total }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('List paywall events error:', error)
    return NextResponse.json({ error: 'Could not load events' }, { status: 500 })
  }
}
