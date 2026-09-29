import { MutableRefObject, useEffect, useRef, useState } from 'react'
import useSWR, { KeyedMutator } from 'swr'
import { PomodoroSession, SessionStatus, SessionType, User } from '@/types'
import { sessionService } from '@/services/sessionService'
import { fetcher } from '@/lib/fetcher'

interface UseSessionRestoreOptions {
  user: User | null
  currentSession: PomodoroSession | null
  restoreSession: (session: PomodoroSession) => void
  setSessionType: (type: SessionType) => void
  emitSessionSync: (session: {
    id: string
    roomId?: string | null
    task: string
    duration: number
    type: SessionType
    userId: string
    username: string
    avatarUrl?: string
    timeRemaining: number
    startedAt: string
    status?: SessionStatus
  }) => void
  ignoreSessionIdRef?: MutableRefObject<string | null>
}

/**
 * Restores an active Pomodoro session for the authenticated user on mount.
 */
export function useSessionRestore({
  user,
  currentSession,
  restoreSession,
  setSessionType,
  emitSessionSync,
  ignoreSessionIdRef,
}: UseSessionRestoreOptions) {
  const ignoredSessionId = ignoreSessionIdRef?.current
  const userId = user?.id
  const completionAttempts = useRef(new Map<string, {
    attempts: number
    pending: boolean
    completed: boolean
    retryAt: number
  }>())
  const mountedRef = useRef(false)
  const [retryAt, setRetryAt] = useState<number | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (retryAt === null) return
    const timer = window.setTimeout(() => setRetryAt(null), Math.max(0, retryAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [retryAt])

  useEffect(() => {
    if (!userId) return

    const retryFailedCompletions = () => {
      if (!navigator.onLine) return

      let nextRetryAt: number | null = null
      for (const [key, attempt] of Array.from(completionAttempts.current)) {
        if (!key.startsWith(`${userId}:`) || attempt.pending || attempt.completed || attempt.attempts < 3) {
          continue
        }

        // Allow a new bounded batch, retaining the cooldown against repeated focus/online events.
        attempt.attempts = 0
        nextRetryAt = Math.min(nextRetryAt ?? attempt.retryAt, attempt.retryAt)
      }

      // Wake the effect even when SWR returns the same session data after reconnecting.
      if (nextRetryAt !== null) setRetryAt(nextRetryAt)
    }

    window.addEventListener('online', retryFailedCompletions)
    window.addEventListener('focus', retryFailedCompletions)
    return () => {
      window.removeEventListener('online', retryFailedCompletions)
      window.removeEventListener('focus', retryFailedCompletions)
    }
  }, [userId])

  const { data: sessions, mutate } = useSWR<PomodoroSession[]>(
    user ? '/api/sessions?activeOnly=1' : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  )

  useEffect(() => {
    if (!user || currentSession || !sessions) {
      return
    }

    let isMounted = true

    const processSessions = async () => {
      try {
        const activeSession = sessions.find(
          (session) =>
            session.userId === user.id &&
            (session.status === SessionStatus.ACTIVE || session.status === SessionStatus.PAUSED)
        )

        if (!activeSession || !isMounted) {
          return
        }

        if (ignoredSessionId && activeSession.id === ignoredSessionId) {
          return
        }

        const startTime = new Date(activeSession.startedAt).getTime()
        const now = Date.now()
        const elapsed = Math.floor((now - startTime) / 1000)
        const totalDuration = activeSession.duration * 60
        const isPaused = activeSession.status === SessionStatus.PAUSED
        const storedRemaining =
          typeof activeSession.remainingSeconds === 'number'
            ? activeSession.remainingSeconds
            : typeof activeSession.timeRemaining === 'number'
              ? activeSession.timeRemaining
              : null
        const currentTimeRemaining = isPaused && storedRemaining !== null
          ? Math.max(0, storedRemaining)
          : Math.max(0, totalDuration - elapsed)

        if (currentTimeRemaining === 0) {
          const key = `${user.id}:${activeSession.id}`
          const attempt = completionAttempts.current.get(key) ?? {
            attempts: 0, pending: false, completed: false, retryAt: 0,
          }
          if (attempt.pending || attempt.completed || attempt.attempts >= 3 || attempt.retryAt > Date.now()) {
            return
          }

          // Reserve before awaiting: effect cleanup does not cancel the HTTP request.
          attempt.pending = true
          attempt.attempts += 1
          completionAttempts.current.set(key, attempt)
          try {
            await sessionService.complete(activeSession.id)
            attempt.completed = true
          } catch (error) {
            attempt.retryAt = Date.now() + 5000 * 2 ** (attempt.attempts - 1)
            if (mountedRef.current && attempt.attempts < 3) {
              setRetryAt(attempt.retryAt)
            }
            throw error
          } finally {
            attempt.pending = false
          }

          // Remove stale data before revalidation can trigger another render.
          await mutate(
            (cached) => cached?.filter((session) => session.id !== activeSession.id),
            { revalidate: false }
          )
          if (mountedRef.current) await mutate()
          return
        }

        if (!isMounted) {
          return
        }

        restoreSession({
          ...activeSession,
          timeRemaining: currentTimeRemaining,
        })
        setSessionType(activeSession.type as SessionType)

        emitSessionSync({
          id: activeSession.id,
          roomId: activeSession.roomId ?? null,
          task: activeSession.task,
          duration: activeSession.duration,
          type: activeSession.type,
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          timeRemaining: currentTimeRemaining,
          startedAt: activeSession.startedAt,
          status: activeSession.status,
        })
      } catch (error) {
        if (isMounted) {
          console.error('Failed to restore session:', error)
        }
      }
    }

    processSessions()

    return () => {
      isMounted = false
    }
  }, [
    sessions,
    user,
    currentSession,
    restoreSession,
    setSessionType,
    emitSessionSync,
    mutate,
    ignoredSessionId,
    retryAt,
  ])

  return { mutateSessions: mutate as KeyedMutator<PomodoroSession[]> }
}
