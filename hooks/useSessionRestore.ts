import { MutableRefObject, useCallback, useEffect, useMemo } from 'react'
import useSWR, { KeyedMutator } from 'swr'
import { PomodoroSession, SessionStatus, SessionType, User } from '@/types'
import { sessionService } from '@/services/sessionService'
import { getAnonymousProfile } from '@/lib/anonymousUser'
import { sendMessageToServiceWorker } from '@/lib/serviceWorker'

interface UseSessionRestoreOptions {
  user: User | null
  token: string | null
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
 * Restores an active Pomodoro session for the current user on mount.
 */
export function useSessionRestore({
  user,
  token,
  currentSession,
  restoreSession,
  setSessionType,
  emitSessionSync,
  ignoreSessionIdRef,
}: UseSessionRestoreOptions) {
  const ignoredSessionId = ignoreSessionIdRef?.current
  const anonymousProfile = useMemo(
    () => (user || typeof window === 'undefined' ? null : getAnonymousProfile()),
    [user]
  )
  const currentUserId = user?.id ?? anonymousProfile?.id ?? null
  const currentUsername = user?.username ?? anonymousProfile?.username ?? null
  const currentAvatarUrl = user?.avatarUrl

  const fetchSessions = useCallback(async (url: string): Promise<PomodoroSession[]> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    } else if (anonymousProfile) {
      headers['X-Anonymous-Id'] = anonymousProfile.id
    }

    const response = await fetch(url, { headers })
    if (!response.ok) {
      throw new Error(`Failed to fetch active sessions, status ${response.status}`)
    }

    return response.json()
  }, [anonymousProfile, token])

  const { data: sessions, mutate } = useSWR<PomodoroSession[]>(
    currentUserId ? '/api/sessions?activeOnly=1' : null,
    fetchSessions,
    {
      revalidateOnFocus: false,
    }
  )

  useEffect(() => {
    if (!currentUserId || !currentUsername || currentSession || !sessions) {
      return
    }

    let isMounted = true

    const processSessions = async () => {
      try {
        const activeSession = sessions.find(
          (session) =>
            session.userId === currentUserId &&
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
          await sessionService.complete(activeSession.id)
          await mutate()
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

        sendMessageToServiceWorker({
          type: 'START_TIMER',
          payload: {
            sessionId: activeSession.id,
            duration: activeSession.duration,
            timeRemaining: currentTimeRemaining,
            startedAt: activeSession.startedAt,
          },
        })

        if (isPaused) {
          sendMessageToServiceWorker({ type: 'PAUSE_TIMER' })
        }

        emitSessionSync({
          id: activeSession.id,
          roomId: activeSession.roomId ?? null,
          task: activeSession.task,
          duration: activeSession.duration,
          type: activeSession.type,
          userId: currentUserId,
          username: currentUsername,
          avatarUrl: currentAvatarUrl,
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
    currentUserId,
    currentUsername,
    currentAvatarUrl,
    currentSession,
    restoreSession,
    setSessionType,
    emitSessionSync,
    mutate,
    ignoredSessionId,
  ])

  return { mutateSessions: mutate as KeyedMutator<PomodoroSession[]> }
}
