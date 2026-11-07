import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdmin } from '@/lib/adminRequest'
import { prisma } from '@/lib/db'
import { getProductUpdate, PRODUCT_UPDATES, PRODUCT_UPDATE_NOTIFICATION_TITLE } from '@/lib/productUpdates'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request)
    if (denied) return denied
    const [users, sent] = await Promise.all([
      prisma.user.count({ where: { isAnonymous: false } }),
      prisma.notification.groupBy({
        by: ['productUpdateId'],
        where: { type: 'PRODUCT_UPDATE', user: { isAnonymous: false }, productUpdateId: { in: PRODUCT_UPDATES.map(update => update.id) } },
        _count: { _all: true },
      }),
    ])
    return NextResponse.json({
      users,
      updates: PRODUCT_UPDATES.map(update => ({ id: update.id, sent: sent.find(row => row.productUpdateId === update.id)?._count._all ?? 0 })),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Product update status error:', error)
    return NextResponse.json({ error: 'Could not load update delivery status.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request)
    if (denied) return denied
    const body = await request.json().catch(() => null)
    const update = typeof body?.updateId === 'string' ? getProductUpdate(body.updateId) : undefined
    if (!update || body?.confirm !== true) {
      return NextResponse.json({ error: 'Choose a known update and confirm sending it.' }, { status: 400 })
    }
    // One atomic insert, no unbounded in-memory audience and no duplicates when
    // an administrator retries or two send requests arrive concurrently.
    const sent = await prisma.$executeRaw`
      INSERT INTO "notifications" ("id", "userId", "type", "title", "message", "productUpdateId", "createdAt")
      SELECT 'product-update:' || md5(${update.id} || ':' || u."id"), u."id",
        'PRODUCT_UPDATE'::"NotificationType", ${PRODUCT_UPDATE_NOTIFICATION_TITLE.en}, ${update.summary.en}, ${update.id}, NOW()
      FROM "users" u
      WHERE u."isAnonymous" = false
      ON CONFLICT ("userId", "productUpdateId") DO NOTHING
    `
    return NextResponse.json({ sent })
  } catch (error) {
    console.error('Send product update error:', error)
    return NextResponse.json({ error: 'Could not confirm delivery. Refresh the status before trying again; retries do not create duplicates.' }, { status: 500 })
  }
}
