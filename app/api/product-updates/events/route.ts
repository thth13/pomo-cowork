import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getProductUpdate } from '@/lib/productUpdates'

export async function POST(request: NextRequest) {
  const token = getTokenFromHeader(request.headers.get('authorization'))
  const identity = token ? verifyToken(token) : null
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const raw = await request.text()
    if (raw.length > 2048) return NextResponse.json({ error: 'Event too large' }, { status: 413 })
    const body = JSON.parse(raw)
    if (!body || typeof body.sessionId !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.sessionId)
      || !['scrolled_to_end', 'closed'].includes(body.action)
      || typeof body.updateId !== 'string' || !getProductUpdate(body.updateId)
      || typeof body.notificationId !== 'string') {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
    }
    const notification = await prisma.notification.findFirst({
      where: { id: body.notificationId, userId: identity.userId, type: 'PRODUCT_UPDATE', productUpdateId: body.updateId },
      select: { id: true },
    })
    if (!notification) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await prisma.productUpdateEvent.createMany({
      data: [{ sessionId: body.sessionId, productUpdateId: body.updateId, action: body.action, userId: identity.userId }],
      skipDuplicates: true,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
    console.error('Save product update event failed:', error)
    return NextResponse.json({ error: 'Could not save event' }, { status: 500 })
  }
}
