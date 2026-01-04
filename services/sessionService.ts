import { PomodoroSession, SessionType } from '@/types'
import { getOrCreateAnonymousId } from '@/lib/anonymousUser'

export interface SessionData {
  task: string
  duration: number
  type: SessionType
  anonymousId?: string
  startedAt?: string
}

const buildHeaders = (token?: string | null) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

export const sessionService = {
  async create(data: SessionData): Promise<PomodoroSession> {
    const token = localStorage.getItem('token')
    const body: Record<string, any> = {
      task: data.task,
      duration: data.duration,
      type: data.type,
    }

    if (data.startedAt) {
      body.startedAt = data.startedAt
    }

    if (!token) {
      body.anonymousId = data.anonymousId ?? getOrCreateAnonymousId()
    }

    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: buildHeaders(token),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error('Failed to create session')
    }

    return response.json()
  },

  async update(id: string, data: Record<string, any>) {
    const token = localStorage.getItem('token')

    const body = {
      ...data,
    }

    if (!token) {
      body.anonymousId = body.anonymousId ?? getOrCreateAnonymousId()
    }

    const response = await fetch(`/api/sessions/${id}`, {
      method: 'PUT',
      headers: buildHeaders(token),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Failed to update session ${id}, status ${response.status}`)
    }
  },

  async complete(id: string) {
    const token = localStorage.getItem('token')

    const body: Record<string, any> = {
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      pausedAt: null,
      timeRemaining: 0,
    }

    if (!token) {
      body.anonymousId = getOrCreateAnonymousId()
    }

    const response = await fetch(`/api/sessions/${id}`, {
      method: 'PUT',
      headers: buildHeaders(token),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Failed to complete session ${id}, status ${response.status}`)
    }
  },
}
