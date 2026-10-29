import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { getRoomAccess } from '@/lib/rooms/access'

export const dynamic = 'force-dynamic'

// Socket publishers reuse the persisted ID and content; a claimed ID alone
// cannot overwrite another participant's message during history reconciliation.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    const authorization = request.headers.get('authorization')
    const token = getTokenFromHeader(authorization)
    const userId = token ? verifyToken(token)?.userId : null
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
    const message = await prisma.chatMessage.findFirst({
      where: { id: params.id, userId, type: 'message' },
      include: { user: { select: { avatarUrl: true, isAnonymous: true } } },
    })
    if (!message || message.user?.isAnonymous ||
        (message.roomId && !(await getRoomAccess(message.roomId, authorization)).room)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
    }
    return NextResponse.json({
      id: message.id, userId, username: message.username, avatarUrl: message.user?.avatarUrl,
      roomId: message.roomId, text: message.text, type: 'message', timestamp: message.createdAt.getTime(),
    }, { headers })
  } catch {
    return NextResponse.json({ error: 'Message unavailable' }, { status: 503, headers })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId')

    const message = await prisma.chatMessage.findUnique({
      where: { id: params.id },
    })

    if (!message) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.chatMessage.delete({
      where: { id: params.id },
    })

    if (sessionId) {
      try {
        await prisma.pomodoroSession.delete({
          where: { id: sessionId },
        })
      } catch (sessionError) {
        if (!(sessionError instanceof Prisma.PrismaClientKnownRequestError && sessionError.code === 'P2025')) {
          console.error(`Failed to delete session ${sessionId}`, sessionError)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete chat message', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
