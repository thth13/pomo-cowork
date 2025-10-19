import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

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
