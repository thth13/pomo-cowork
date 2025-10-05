import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { ChatMessage as PublicChatMessage } from '@/types'

const MAX_LEN = 1000
const PAGE_SIZE = 50

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const take = Number(searchParams.get('take') || PAGE_SIZE)

  const messages = await (prisma as any).chatMessage.findMany({
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' }
  }) as Array<{ id: string; userId: string | null; username: string; text: string; createdAt: Date }>

  const items: PublicChatMessage[] = messages.reverse().map((m) => ({
    id: m.id,
    userId: m.userId,
    username: m.username,
    text: m.text,
    timestamp: new Date(m.createdAt).getTime()
  }))

  return NextResponse.json({
    items,
    nextCursor: messages.length === take ? messages[messages.length - 1]?.id ?? null : null
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { userId?: string | null; username?: string; text?: string } | null
  if (!body) return NextResponse.json({ error: 'invalid_json' }, { status: 400 })

  const text = (body.text ?? '').toString().slice(0, MAX_LEN).trim()
  if (!text) return NextResponse.json({ error: 'empty' }, { status: 400 })

  const username = (body.username ?? 'Guest').toString().slice(0, 100)
  const userId = body.userId ?? null

  const saved = await (prisma as any).chatMessage.create({
    data: { text, username, userId }
  }) as { id: string; userId: string | null; username: string; text: string; createdAt: Date }

  const result: PublicChatMessage = {
    id: saved.id,
    userId: saved.userId,
    username: saved.username,
    text: saved.text,
    timestamp: new Date(saved.createdAt).getTime()
  }
  return NextResponse.json(result)
}