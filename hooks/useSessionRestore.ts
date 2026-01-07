import { MutableRefObject, useEffect } from 'react'
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

  const { data: sessions, mutate } = useSWR<PomodoroSession[]>(
    user ? '/api/sessions' : null,
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
  ])

  return { mutateSessions: mutate as KeyedMutator<PomodoroSession[]> }
}
