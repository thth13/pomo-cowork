import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import type { ChatMessage as PublicChatMessage } from '@/types'

export const dynamic = 'force-dynamic'

const MAX_LEN = 1000
const PAGE_SIZE = 20

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const take = Number(searchParams.get('take') || PAGE_SIZE)
  const roomIdParam = searchParams.get('roomId')

  const normalizedRoomId = (() => {
    if (typeof roomIdParam !== 'string') return null
    const trimmed = roomIdParam.trim()
    return trimmed ? trimmed : null
  })()

  if (normalizedRoomId) {
    const room = await prisma.room.findUnique({
      where: { id: normalizedRoomId },
      select: { id: true, privacy: true, ownerId: true },
    })

    if (!room) {
      return NextResponse.json({ error: 'Invalid room' }, { status: 400 })
    }

    if (room.privacy === 'PRIVATE') {
      const authHeader = request.headers.get('authorization')
      const token = getTokenFromHeader(authHeader)
      const payload = token ? verifyToken(token) : null

      if (!payload || payload.userId !== room.ownerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }

  // Для загрузки старых сообщений (при прокрутке вверх)
  const messages = await prisma.chatMessage.findMany({
    where: {
      roomId: normalizedRoomId,
    },
    take: take + 1, // Берем на 1 больше чтобы узнать есть ли еще сообщения
    ...(cursor ? { 
      skip: 1, 
      cursor: { id: cursor } 
    } : {}),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      username: true,
      roomId: true,
      text: true,
      type: true,
      actionType: true,
      actionDuration: true,
      actionTask: true,
      createdAt: true,
      user: {
        select: {
          avatarUrl: true
        }
      }
    }
  })

  const hasMore = messages.length > take
  const resultMessages = hasMore ? messages.slice(0, take) : messages

  const items: PublicChatMessage[] = resultMessages.reverse().map((m) => ({
    id: m.id,
    userId: m.userId,
    username: m.username,
    avatarUrl: m.user?.avatarUrl || undefined,
    roomId: m.roomId ?? null,
    text: m.text,
    timestamp: new Date(m.createdAt).getTime(),
    type: m.type === 'system' ? 'system' : 'message',
    ...(m.type === 'system' && m.actionType && {
      action: {
        type: m.actionType as any,
        ...(m.actionDuration && { duration: m.actionDuration }),
        ...(m.actionTask ? { task: m.actionTask } : {})
      }
    })
  }))

  return NextResponse.json({
    items,
    hasMore,
    // Курсор - это самое старое сообщение из загруженных (первое в массиве items)
    nextCursor: hasMore && items.length > 0 ? items[0].id : null
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { 
    userId?: string | null; 
    username?: string; 
    text?: string;
    roomId?: string | null;
    type?: 'message' | 'system';
    action?: {
      type: 'work_start' | 'break_start' | 'long_break_start' | 'timer_stop' | 'session_complete' | 'time_tracking_start';
      duration?: number;
      task?: string;
    }
  } | null
  if (!body) return NextResponse.json({ error: 'invalid_json' }, { status: 400 })

  const isSystem = body.type === 'system'
  const username = (body.username ?? 'Guest').toString().slice(0, 100)
  const userId = body.userId ?? null
  const normalizedRoomId = (() => {
    if (typeof body.roomId !== 'string') return null
    const trimmed = body.roomId.trim()
    return trimmed ? trimmed : null
  })()
  const actionTaskInput = body.action?.task ? body.action.task.toString().slice(0, 120) : null

  if (normalizedRoomId) {
    const room = await prisma.room.findUnique({
      where: { id: normalizedRoomId },
      select: { id: true, privacy: true, ownerId: true },
    })

    if (!room) {
      return NextResponse.json({ error: 'Invalid room' }, { status: 400 })
    }

    if (room.privacy === 'PRIVATE') {
      const authHeader = request.headers.get('authorization')
      const token = getTokenFromHeader(authHeader)
      const payload = token ? verifyToken(token) : null

      const allowedByOwnerToken = Boolean(payload && payload.userId === room.ownerId)
      const allowedSystemOwnerId = Boolean(isSystem && userId && userId === room.ownerId)

      if (!allowedByOwnerToken && !allowedSystemOwnerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }

  let text: string
  let actionType: string | null = null
  let actionDuration: number | null = null
  let actionTask: string | null = null

  if (isSystem && body.action) {
    // Для системных сообщений генерируем текст на основе действия
    switch (body.action.type) {
      case 'work_start':
        actionTask = actionTaskInput
        text = actionTask
          ? `${username} начал работу "${actionTask}"${body.action.duration ? ` на ${body.action.duration} минут` : ''}`
          : `${username} начал работу${body.action.duration ? ` на ${body.action.duration} минут` : ''}`
        actionDuration = body.action.duration || null
        break
      case 'break_start':
        text = `${username} начал перерыв`
        break
      case 'long_break_start':
        text = `${username} начал долгий перерыв`
        break
      case 'session_complete':
        actionTask = actionTaskInput
        text = actionTask
          ? `${username} завершил сессию "${actionTask}"`
          : `${username} завершил сессию`
        break
      case 'time_tracking_start':
        actionTask = actionTaskInput
        text = actionTask
          ? `${username} запустил тайм-трек сессию "${actionTask}"`
          : `${username} запустил тайм-трек сессию`
        break
      case 'timer_stop':
        text = `${username} остановил таймер`
        break
      default:
        text = `${username} выполнил действие`
    }
    actionType = body.action.type
    if (!actionTask) {
      actionTask = actionTaskInput
    }
  } else {
    text = (body.text ?? '').toString().slice(0, MAX_LEN).trim()
    if (!text) return NextResponse.json({ error: 'empty' }, { status: 400 })
  }

  const saved = await prisma.chatMessage.create({
    data: { 
      text, 
      username, 
      userId,
      ...(normalizedRoomId ? { roomId: normalizedRoomId } : {}),
      type: isSystem ? 'system' : 'message',
      actionType,
      actionDuration,
      actionTask
    },
    select: {
      id: true,
      userId: true,
      username: true,
      roomId: true,
      text: true,
      type: true,
      actionType: true,
      actionDuration: true,
      actionTask: true,
      createdAt: true,
      user: {
        select: {
          avatarUrl: true
        }
      }
    }
  })

  const result: PublicChatMessage = {
    id: saved.id,
    userId: saved.userId,
    username: saved.username,
  avatarUrl: saved.user?.avatarUrl || undefined,
    roomId: saved.roomId ?? null,
    text: saved.text,
    timestamp: new Date(saved.createdAt).getTime(),
    type: saved.type === 'system' ? 'system' : 'message',
    ...(saved.type === 'system' && saved.actionType && {
      action: {
        type: saved.actionType as any,
        ...(saved.actionDuration && { duration: saved.actionDuration }),
        ...(saved.actionTask ? { task: saved.actionTask } : {})
      }
    })
  }
  return NextResponse.json(result)
}
