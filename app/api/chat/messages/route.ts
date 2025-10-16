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
  }) as Array<{ 
    id: string; 
    userId: string | null; 
    username: string; 
    text: string; 
    type?: string;
    actionType?: string;
    actionDuration?: number;
    createdAt: Date;
  }>

  // Получаем уникальные userId
  const userIds = Array.from(new Set(messages.map(m => m.userId).filter(Boolean))) as string[]
  
  // Загружаем аватарки пользователей
  const users = userIds.length > 0 ? await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, avatarUrl: true }
  }) : []
  
  const userAvatarMap = new Map(users.map(u => [u.id, u.avatarUrl]))

  const items: PublicChatMessage[] = messages.reverse().map((m) => ({
    id: m.id,
    userId: m.userId,
    username: m.username,
    avatarUrl: m.userId ? userAvatarMap.get(m.userId) || undefined : undefined,
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
  }

  // Получаем аватарку пользователя, если есть userId
  let avatarUrl: string | undefined
  if (saved.userId) {
    const user = await prisma.user.findUnique({
      where: { id: saved.userId },
      select: { avatarUrl: true }
    })
    avatarUrl = user?.avatarUrl || undefined
  }

  const result: PublicChatMessage = {
    id: saved.id,
    userId: saved.userId,
    username: saved.username,
    avatarUrl,
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