import { PomodoroSession, SessionType } from '@/types'
import { getOrCreateAnonymousId } from '@/lib/anonymousUser'
import { useAuthStore } from '@/store/useAuthStore'

export interface SessionData {
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

interface SessionUpdateResult {
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
  } | null
}

// Timer completion and session restoration can overlap within the same tab.
const pendingCompletions = new Map<string, Promise<SessionUpdateResult>>()

const applySessionProgression = (result: SessionUpdateResult) => {
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
}

export const sessionService = {
  async create(data: SessionData): Promise<PomodoroSession> {
    const token = useAuthStore.getState().token
    const body: Record<string, any> = {
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
    if (id.startsWith('temp_')) {
      return
    }

    const token = useAuthStore.getState().token

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

    const result = await response.json()
    if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
      return applySessionProgression(result)
    }
    return result
  },

  async complete(id: string) {
    if (id.startsWith('temp_')) {
      return null
    }

    const token = useAuthStore.getState().token
    const owner = useAuthStore.getState().user?.id ?? getOrCreateAnonymousId()
    const key = `${owner}:${id}`
    const pending = pendingCompletions.get(key)
    if (pending) return pending

    const completion = (async () => {
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

      return applySessionProgression(await response.json())
    })()

    pendingCompletions.set(key, completion)
    try {
      return await completion
    } finally {
      pendingCompletions.delete(key)
    }
  },
}
