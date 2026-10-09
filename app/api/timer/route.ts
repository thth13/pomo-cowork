import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { hasActiveProAccess } from '@/lib/pro'
import { POST as createSession } from '@/app/api/sessions/route'
import { PUT as updateSession } from '@/app/api/sessions/[id]/route'
import { SessionType } from '@/types'

export const dynamic = 'force-dynamic'

const noCache = { 'Cache-Control': 'no-store' }
async function account(request: NextRequest) {
  const token = getTokenFromHeader(request.headers.get('authorization'))
  const payload = token ? verifyToken(token) : null
  if (!payload) return null
  return prisma.user.findFirst({ where: { id: payload.userId, isAnonymous: false }, include: { settings: true } })
}

export async function GET(request: NextRequest) {
  try {
    const user = await account(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noCache })
    const [session, lastSession] = await Promise.all([
      prisma.pomodoroSession.findFirst({ where: { userId: user.id, status: { in: ['ACTIVE', 'PAUSED'] } }, orderBy: { createdAt: 'desc' } }),
      prisma.pomodoroSession.findFirst({ where: { userId: user.id, status: { in: ['COMPLETED', 'CANCELLED'] } }, orderBy: { endedAt: 'desc' } }),
    ])
    return NextResponse.json({
      serverNow: Date.now(), session, lastSession,
      user: { id: user.id, username: user.username, canTimeTrack: hasActiveProAccess(user), settings: user.settings },
    }, { headers: noCache })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: noCache })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await account(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noCache })
    const body = await request.json()
    const headers = { 'Content-Type': 'application/json', Authorization: request.headers.get('authorization')! }
    const forward = (path: string, data: Record<string, unknown>) => new NextRequest(new URL(path, request.url), {
      method: path === '/api/sessions' ? 'POST' : 'PUT', headers, body: JSON.stringify(data),
    })
    if (body.action === 'start') {
      if (!Object.values(SessionType).includes(body.mode)) return NextResponse.json({ error: 'INVALID_SETTINGS' }, { status: 400 })
      if (body.mode === SessionType.TIME_TRACKING && !hasActiveProAccess(user)) return NextResponse.json({ error: 'PRO_REQUIRED' }, { status: 403 })
      const settings = user.settings ?? { workDuration: 25, shortBreak: 5, longBreak: 15 }
      const duration = body.mode === SessionType.TIME_TRACKING ? 1440 : body.mode === SessionType.SHORT_BREAK ? settings.shortBreak : body.mode === SessionType.LONG_BREAK ? settings.longBreak : settings.workDuration
      const labels = { WORK: 'Focus', SHORT_BREAK: 'Short break', LONG_BREAK: 'Long break', TIME_TRACKING: 'Time tracking' }
      return createSession(forward('/api/sessions', {
        type: body.mode, duration, task: typeof body.task === 'string' && body.task.trim() ? body.task.trim().slice(0, 500) : labels[body.mode as SessionType],
        expectedSessionId: null,
      }))
    }
    if (!['pause', 'resume', 'stop', 'complete'].includes(body.action)) return NextResponse.json({ error: 'INVALID_SETTINGS' }, { status: 400 })
    const session = await prisma.pomodoroSession.findFirst({ where: { userId: user.id, status: { in: ['ACTIVE', 'PAUSED'] } }, orderBy: { createdAt: 'desc' } })
    if (!session || session.id !== body.sessionId || session.updatedAt.toISOString() !== body.updatedAt) {
      return NextResponse.json({ error: 'STALE' }, { status: 409 })
    }
    const now = Date.now()
    const remaining = session.status === 'PAUSED' ? session.remainingSeconds ?? session.duration * 60
      : Math.max(0, session.duration * 60 - Math.floor((now - session.startedAt.getTime()) / 1000))
    const data: Record<string, unknown> = { expectedUpdatedAt: session.updatedAt.toISOString() }
    if (body.action === 'pause') {
      if (session.status !== 'ACTIVE' || remaining === 0) return NextResponse.json({ error: 'STALE' }, { status: 409 })
      Object.assign(data, { status: 'PAUSED', pausedAt: new Date(now).toISOString(), timeRemaining: remaining })
    } else if (body.action === 'resume') {
      if (session.status !== 'PAUSED') return NextResponse.json({ error: 'STALE' }, { status: 409 })
      Object.assign(data, { status: 'ACTIVE', pausedAt: null, timeRemaining: remaining, startedAt: new Date(now - (session.duration * 60 - remaining) * 1000).toISOString() })
    } else if (body.action === 'complete') {
      if (session.status !== 'ACTIVE' || remaining > 0) return NextResponse.json({ error: 'STALE' }, { status: 409 })
      const endedAt = new Date(session.startedAt.getTime() + session.duration * 60000).toISOString()
      Object.assign(data, { status: 'COMPLETED', completedAt: endedAt, endedAt, pausedAt: null, timeRemaining: 0 })
    } else {
      Object.assign(data, { status: 'CANCELLED', endedAt: new Date(now).toISOString(), pausedAt: null, timeRemaining: remaining })
    }
    return updateSession(forward(`/api/sessions/${session.id}`, data), { params: { id: session.id } })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: noCache })
  }
}
