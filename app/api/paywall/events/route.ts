import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (
    !body ||
    (body.event !== 'paywall_open' && body.event !== 'paywall_checkout_click' && body.event !== 'support_pomo_click') ||
    typeof body.pagePath !== 'string' ||
    !body.pagePath.startsWith('/') ||
    body.pagePath.length > 500 ||
    (body.plan != null && body.plan !== 'monthly' && body.plan !== 'yearly') ||
    (body.event === 'paywall_checkout_click' && body.plan == null)
  ) {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
  }

  try {
    const token = getTokenFromHeader(request.headers.get('authorization'))
    const payload = token ? verifyToken(token) : null
    const user = payload?.userId
      ? await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, isAnonymous: true },
        })
      : null

    await prisma.paywallEvent.create({
      data: {
        event: body.event,
        plan: body.plan ?? null,
        pagePath: body.pagePath,
        userId: user?.id ?? null,
        isAuthenticated: !!user && !user.isAnonymous,
      },
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error('Save paywall event error:', error)
    return NextResponse.json({ error: 'Could not save event' }, { status: 500 })
  }
}
