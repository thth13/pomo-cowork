import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// One daily goal per room. Changing it applies to the current UTC day too.
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'))
    const userId = token ? verifyToken(token)?.userId : null
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: unknown = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid challenge' }, { status: 400 })
    }
    const input = body as Record<string, unknown>
    const title = typeof input.title === 'string' ? input.title.trim() : ''
    const targetMinutes = input.targetMinutes
    const expectedUpdatedAt = input.expectedUpdatedAt
    if (!title || title.length > 80) {
      return NextResponse.json({ error: 'Title must contain 1 to 80 characters' }, { status: 400 })
    }
    if (typeof targetMinutes !== 'number' || !Number.isInteger(targetMinutes) || targetMinutes < 5 || targetMinutes > 480) {
      return NextResponse.json({ error: 'Daily goal must be between 5 and 480 minutes' }, { status: 400 })
    }
    if (expectedUpdatedAt !== null && (typeof expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(expectedUpdatedAt)))) {
      return NextResponse.json({ error: 'Expected challenge version is required' }, { status: 400 })
    }

    const select = { id: true, title: true, targetMinutes: true, createdAt: true, updatedAt: true } as const
    const result = await prisma.$transaction(async tx => {
      // Ownership can transfer when the owner leaves. Hold the room lock until
      // the goal is saved so an old owner cannot write after that transfer.
      const [room] = await tx.$queryRaw<Array<{ ownerId: string }>>`
        SELECT "ownerId" FROM "rooms" WHERE "id" = ${params.id} FOR UPDATE
      `
      if (!room) return { status: 404 as const, error: 'Not found' }
      if (room.ownerId !== userId) return { status: 403 as const, error: 'Forbidden' }

      if (expectedUpdatedAt === null) {
        const challenge = await tx.roomChallenge.create({ data: { roomId: params.id, title, targetMinutes }, select })
        return { status: 200 as const, challenge }
      }
      const previousVersion = new Date(expectedUpdatedAt as string)
      const updated = await tx.roomChallenge.updateMany({
        where: { roomId: params.id, updatedAt: previousVersion },
        data: {
          title,
          targetMinutes,
          updatedAt: new Date(Math.max(Date.now(), previousVersion.getTime() + 1)),
        },
      })
      if (updated.count === 0) return { status: 409 as const, error: 'Challenge has changed. Reload it before saving.' }
      const challenge = await tx.roomChallenge.findUnique({ where: { roomId: params.id }, select })
      return { status: 200 as const, challenge }
    })
    if (result.status !== 200) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.challenge, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Challenge has changed. Reload it before saving.' }, { status: 409 })
    }
    console.error('Save room challenge error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
