import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { beepJson } from '@/lib/beepApi'
import { beepActions, beepTourSteps } from '@/lib/beepEventTypes'

const uuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const buckets = new Map<string, { count: number; until: number }>()

export async function POST(request: NextRequest) {
  if (request.headers.get('sec-fetch-site') === 'cross-site' || request.headers.get('origin') && request.headers.get('origin') !== request.nextUrl.origin) return beepJson({ error: 'Forbidden' }, 403)
  const raw = await request.text()
  if (raw.length > 2048) return beepJson({ error: 'Event too large' }, 413)
  let body
  try { body = JSON.parse(raw) } catch { return beepJson({ error: 'Invalid event' }, 400) }
  if (!body || !uuid(body.id) || !uuid(body.visitId) || !beepActions.includes(body.action)
    || !['tour', 'welcome', 'chat', 'character', 'controls', 'page'].includes(body.surface)
    || typeof body.pagePath !== 'string' || !body.pagePath.startsWith('/') || body.pagePath.length > 500
    || (body.step !== null && (!Number.isInteger(body.step) || body.step < 0 || body.step >= beepTourSteps.length))
    || (body.surface === 'tour' && body.step === null)) return beepJson({ error: 'Invalid event' }, 400)
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'))
    const identity = token ? verifyToken(token) : null
    const now = Date.now()
    buckets.forEach((bucket, key) => { if (bucket.until <= now) buckets.delete(key) })
    const key = identity?.userId ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'guest'
    const bucket = buckets.get(key) ?? { count: 0, until: now + 60_000 }
    if (bucket.count >= 120 || !buckets.has(key) && buckets.size >= 10000) return beepJson({ error: 'Rate limit' }, 429)
    bucket.count++
    buckets.set(key, bucket)
    const user = identity?.userId ? await prisma.user.findUnique({ where: { id: identity.userId }, select: { id: true, isAnonymous: true } }) : null
    await prisma.beepEvent.createMany({ data: [{
      id: body.id, visitId: body.visitId, action: body.action, surface: body.surface, step: body.step,
      pagePath: body.pagePath, userId: user?.id ?? null, isAuthenticated: Boolean(user && !user.isAnonymous),
    }], skipDuplicates: true })
    return beepJson({ ok: true }, 201)
  } catch (error) {
    console.error('Save Beep event failed:', error)
    return beepJson({ error: 'Could not save event' }, 500)
  }
}
