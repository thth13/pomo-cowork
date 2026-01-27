import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id

    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)
    const viewer = token ? verifyToken(token) : null

    if (viewer && viewer.userId === userId) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { profileViews: { increment: 1 } },
      select: { profileViews: true },
    })

    return NextResponse.json({ ok: true, profileViews: updated.profileViews })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    console.error('Error incrementing profile views:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
