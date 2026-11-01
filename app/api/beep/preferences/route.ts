import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { companionPatch } from '@/lib/companionPreferences'

export const dynamic = 'force-dynamic'
const select = { visible: true, wandering: true, animations: true, x: true, y: true } as const
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

async function owner(request: NextRequest) {
  if (request.headers.get('sec-fetch-site') === 'cross-site' || request.headers.get('origin') && request.headers.get('origin') !== request.nextUrl.origin) return null
  const token = getTokenFromHeader(request.headers.get('authorization'))
  const identity = token ? verifyToken(token) : null
  if (!identity) return null
  const user = await prisma.user.findUnique({ where: { id: identity.userId }, select: { id: true, isAnonymous: true } })
  return user && !user.isAnonymous ? user.id : null
}

export async function GET(request: NextRequest) {
  try {
    const userId = await owner(request)
    if (!userId) return reply({ error: 'unauthorized' }, 401)
    return reply({ preferences: await prisma.beepPreferences.findUnique({ where: { userId }, select }) })
  } catch { return reply({ error: 'unavailable' }, 503) }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await owner(request)
    if (!userId) return reply({ error: 'unauthorized' }, 401)
    if (!request.headers.get('content-type')?.includes('application/json')) return reply({ error: 'invalid_request' }, 400)
    const body = await request.text()
    if (body.length > 1024) return reply({ error: 'invalid_request' }, 400)
    let data: unknown
    try { data = JSON.parse(body) } catch { return reply({ error: 'invalid_request' }, 400) }
    const patch = companionPatch(data)
    if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.keys(patch).length || Object.keys(data).length !== Object.keys(patch).length) return reply({ error: 'invalid_request' }, 400)
    const preferences = await prisma.beepPreferences.upsert({ where: { userId }, create: { userId, ...patch }, update: patch, select })
    return reply({ preferences })
  } catch { return reply({ error: 'unavailable' }, 503) }
}
