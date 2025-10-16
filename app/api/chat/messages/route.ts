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
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          avatarUrl: true
        }
      }
    }
  }) as Array<{ 
    id: string; 
    userId: string | null; 
    username: string; 
    text: string; 
    type?: string;
    actionType?: string;
    actionDuration?: number;
    createdAt: Date;
    user?: { avatarUrl: string | null } | null
  }>

  const items: PublicChatMessage[] = messages.reverse().map((m) => ({
    id: m.id,
    userId: m.userId,
    username: m.username,
    avatarUrl: m.user?.avatarUrl || undefined,
    text: m.text,
    timestamp: new Date(m.createdAt).getTime(),
    type: m.type === 'system' ? 'system' : 'message',
    ...(m.type === 'system' && m.actionType && {
      action: {
        type: m.actionType as any,
        ...(m.actionDuration && { duration: m.actionDuration })
      }
    })
  }))

  return NextResponse.json({
    items,
    nextCursor: messages.length === take ? messages[messages.length - 1]?.id ?? null : null
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { 
    userId?: string | null; 
    username?: string; 
    text?: string;
    type?: 'message' | 'system';
    action?: {
      type: 'work_start' | 'break_start' | 'long_break_start' | 'timer_stop';
      duration?: number;
    }
  } | null
  if (!body) return NextResponse.json({ error: 'invalid_json' }, { status: 400 })

  const isSystem = body.type === 'system'
  const username = (body.username ?? 'Guest').toString().slice(0, 100)
  const userId = body.userId ?? null

  let text: string
  let actionType: string | null = null
  let actionDuration: number | null = null

  if (isSystem && body.action) {
    // Для системных сообщений генерируем текст на основе действия
    switch (body.action.type) {
      case 'work_start':
        text = `${username} начал работу на ${body.action.duration} минут`
        actionDuration = body.action.duration || null
        break
      case 'break_start':
        text = `${username} начал перерыв`
        break
      case 'long_break_start':
        text = `${username} начал долгий перерыв`
        break
      case 'timer_stop':
        text = `${username} остановил таймер`
        break
      default:
        text = `${username} выполнил действие`
    }
    actionType = body.action.type
  } else {
    text = (body.text ?? '').toString().slice(0, MAX_LEN).trim()
    if (!text) return NextResponse.json({ error: 'empty' }, { status: 400 })
  }

  const saved = await (prisma as any).chatMessage.create({
    data: { 
      text, 
      username, 
      userId,
      type: isSystem ? 'system' : 'message',
      actionType,
      actionDuration
    },
    include: {
      user: {
        select: {
          avatarUrl: true
        }
      }
    }
  }) as { 
    id: string; 
    userId: string | null; 
    username: string; 
    text: string; 
    type: string;
    actionType?: string;
    actionDuration?: number;
    createdAt: Date;
    user?: { avatarUrl: string | null } | null
  }

  const result: PublicChatMessage = {
    id: saved.id,
    userId: saved.userId,
    username: saved.username,
    avatarUrl: saved.user?.avatarUrl || undefined,
    text: saved.text,
    timestamp: new Date(saved.createdAt).getTime(),
    type: saved.type === 'system' ? 'system' : 'message',
    ...(saved.type === 'system' && saved.actionType && {
      action: {
        type: saved.actionType as any,
        ...(saved.actionDuration && { duration: saved.actionDuration })
      }
    })
  }
  return NextResponse.json(result)
}