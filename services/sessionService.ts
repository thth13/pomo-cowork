import { PomodoroSession, SessionStatus, SessionType } from '@/types'
import { getOrCreateAnonymousId } from '@/lib/anonymousUser'
import { useAuthStore } from '@/store/useAuthStore'

export interface SessionData {
  id?: string
  task: string
  duration: number
  type: SessionType
  roomId?: string | null
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

const fetchWithRetry = async (
  url: string,
  init: RequestInit,
  retries = 2
): Promise<Response> => {
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, init)
      if (response.status < 500 || attempt === retries) {
        return response
      }
    } catch (error) {
      lastError = error
      if (attempt === retries) {
        throw error
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
  }

  throw lastError ?? new Error(`Failed to update session via ${url}`)
}

export const sessionService = {
  async create(data: SessionData): Promise<PomodoroSession> {
    const token = useAuthStore.getState().token
    const requestId = data.id ?? (
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `client_${crypto.randomUUID()}`
        : `client_${Date.now()}_${Math.random().toString(36).slice(2)}`
    )
    const body: Record<string, any> = {
      id: requestId,
      task: data.task,
      duration: data.duration,
      type: data.type,
    }

    if (data.roomId) {
      body.roomId = data.roomId
    }

    if (data.startedAt) {
      body.startedAt = data.startedAt
    }

    if (!token) {
      body.anonymousId = data.anonymousId ?? getOrCreateAnonymousId()
    }

    const response = await fetchWithRetry('/api/sessions', {
      method: 'POST',
      headers: buildHeaders(token),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error('Failed to create session')
    }

    const session = await response.json() as PomodoroSession
    if (session.status !== SessionStatus.ACTIVE) {
      throw new Error(`Session creation was superseded with status ${session.status}`)
    }

    return session
  },

  async update(id: string, data: Record<string, any>) {
    if (id.startsWith('temp_')) {
      return null
    }

    const token = useAuthStore.getState().token

    const body = {
      ...data,
    }

    if (!token) {
      body.anonymousId = body.anonymousId ?? getOrCreateAnonymousId()
    }

    const response = await fetchWithRetry(`/api/sessions/${id}`, {
      method: 'PUT',
      headers: buildHeaders(token),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Failed to update session ${id}, status ${response.status}`)
    }

    return response.json() as Promise<Partial<PomodoroSession>>
  },

  async complete(id: string) {
    if (id.startsWith('temp_')) {
      return null
    }

    const token = useAuthStore.getState().token

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

    const response = await fetchWithRetry(`/api/sessions/${id}`, {
      method: 'PUT',
      headers: buildHeaders(token),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Failed to complete session ${id}, status ${response.status}`)
    }

    const result = await response.json() as {
      status?: string
      progression?: {
        experience: number
        currentStreak: number
        longestStreak: number
        rankUp?: {
          previousRank: string
          rank: string
          rankName: string
          experience: number
          shouldNotify: boolean
        } | null
      }
    }

    if (result.status !== SessionStatus.COMPLETED) {
      throw new Error(`Session ${id} was not completed; status is ${result.status ?? 'unknown'}`)
    }

    if (result.progression) {
      useAuthStore.setState((state) => ({
        user: state.user
          ? {
              ...state.user,
              experience: result.progression?.experience,
              currentStreak: result.progression?.currentStreak,
              longestStreak: result.progression?.longestStreak,
            }
          : null,
      }))

      if (result.progression.rankUp && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rank-up', {
          detail: result.progression.rankUp,
        }))
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('session-completed'))
    }

    return result
  },
}
