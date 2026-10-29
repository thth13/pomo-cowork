import { PomodoroSession, SessionStatus, SessionType } from '@/types'
import { getOrCreateAnonymousId } from '@/lib/anonymousUser'
import { useAuthStore } from '@/store/useAuthStore'
import { useTimerStore } from '@/store/useTimerStore'
import { useProjectSelection } from '@/store/useProjectSelection'
import { notifyTimerChanged } from '@/lib/timerEvents'

export interface SessionData {
  task: string
  duration: number
  type: SessionType
  projectId?: string | null
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
  status?: SessionStatus
  alreadyRemoved?: boolean
  progression?: {
    awardedNow?: boolean
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
    const userId = useAuthStore.getState().user?.id
    const body: Record<string, any> = {
      task: data.task,
      duration: data.duration,
      type: data.type,
      ...(token ? { expectedSessionId: null } : {}),
    }

    const focus = useTimerStore.getState().selectedTask
    if (focus && (data.type === SessionType.WORK || data.type === SessionType.TIME_TRACKING)) {
      body.workProjectId = focus.parentId ?? focus.id
      body.taskRecordId = focus.parentId ? focus.id : null
    }

    const selected = useProjectSelection.getState()
    if (token && (data.type === SessionType.WORK || data.type === SessionType.TIME_TRACKING)) {
      const userId = useAuthStore.getState().user?.id
      body.projectId = data.projectId ?? (selected.userId === userId ? selected.projectId : null)
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
      if (response.status === 409) throw new Error('TIMER_CONFLICT')
      throw new Error('Failed to create session')
    }

    const session = await response.json()
    notifyTimerChanged(userId)
    return session
  },

  async update(id: string, data: Record<string, any>) {
    if (id.startsWith('temp_')) {
      return
    }

    const token = useAuthStore.getState().token
    const userId = useAuthStore.getState().user?.id

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
    notifyTimerChanged(userId)
    if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
      return applySessionProgression(result)
    }
    return result
  },

  async complete(id: string, expectedUpdatedAt?: string, completedAt = new Date().toISOString()) {
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
        ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
        status: 'COMPLETED',
        completedAt,
        endedAt: completedAt,
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
        signal: AbortSignal.timeout(20000),
      })

      if (!response.ok) {
        throw new Error(`Failed to complete session ${id}, status ${response.status}`)
      }

      const result = await response.json()
      notifyTimerChanged(owner)
      if (useAuthStore.getState().token !== token ||
          (useAuthStore.getState().user?.id ?? getOrCreateAnonymousId()) !== owner) return result as SessionUpdateResult
      return applySessionProgression(result)
    })()

    pendingCompletions.set(key, completion)
    try {
      return await completion
    } finally {
      pendingCompletions.delete(key)
    }
  },
}
