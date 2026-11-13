import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { focusPreferenceKeys, readFocusPreferences, type FocusPreferences } from '@/lib/focusPreferences'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
function owner(request: NextRequest) {
  const token = getTokenFromHeader(request.headers.get('authorization'))
  return token ? verifyToken(token)?.userId : undefined
}

export async function GET(request: NextRequest) {
  const userId = owner(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { settings: true } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404, headers })
    return NextResponse.json(readFocusPreferences(user.settings), { headers })
  } catch (error) {
    console.error('Load workspace preferences failed:', error)
    return NextResponse.json({ error: 'Could not load preferences.' }, { status: 500, headers })
  }
}

export async function PUT(request: NextRequest) {
  const userId = owner(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length ||
      Object.entries(body).some(([key, value]) => !focusPreferenceKeys.includes(key as typeof focusPreferenceKeys[number]) || typeof value !== 'boolean')) {
    return NextResponse.json({ error: 'Invalid preferences.' }, { status: 400, headers })
  }
  const patch = body as Partial<FocusPreferences>
  try {
    const result = await prisma.$transaction(async tx => {
      // Serialize changes per account so before/after values and their audit rows agree.
      const users = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE`
      if (!users.length) return null
      const current = await tx.userSettings.findUnique({ where: { userId } })
      const before = readFocusPreferences(current)
      const next = { ...before, ...patch }
      const changes = focusPreferenceKeys.filter(field => next[field] !== before[field])
      if (!changes.length) return before
      await tx.userSettings.upsert({ where: { userId }, create: { userId, ...next }, update: patch })
      await tx.settingsChange.createMany({ data: changes.map(field => ({
        userId, field, previousValue: before[field], nextValue: next[field],
      })) })
      return next
    })
    if (!result) return NextResponse.json({ error: 'User not found' }, { status: 404, headers })
    return NextResponse.json(result, { headers })
  } catch (error) {
    console.error('Save workspace preferences failed:', error)
    return NextResponse.json({ error: 'Could not save preferences.' }, { status: 500, headers })
  }
}
