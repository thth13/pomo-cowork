import { MutableRefObject, useCallback, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { PomodoroSession, SessionStatus, SessionType, User } from '@/types'
import { sessionService } from '@/services/sessionService'
import { useAuthStore } from '@/store/useAuthStore'
import { useTimerStore } from '@/store/useTimerStore'
import { sendMessageToServiceWorker } from '@/lib/serviceWorker'
import { isTimerSettingsSavePending } from '@/services/timerSettingsService'

interface AccountTimerSnapshot {
  session: PomodoroSession | null
  lastSession: PomodoroSession | null
  serverNow: number
  user: { id: string; username: string; canTimeTrack: boolean; settings: User['settings'] }
  localFingerprint: string
  blockedDuringRequest: boolean
}
interface UseSessionRestoreOptions {
  user: User | null
  currentSession: PomodoroSession | null
  restoreSession: (session: PomodoroSession) => void
  setSessionType: (type: SessionType) => void
  emitSessionSync: (session: {
    id: string; roomId?: string | null; task: string; duration: number; type: SessionType
    userId: string; username: string; avatarUrl?: string; timeRemaining: number; startedAt: string; status?: SessionStatus
  }) => void
  ignoreSessionIdRef?: MutableRefObject<string | null>
  busy?: boolean
  onRemoteEnd?: (completed: boolean, type: SessionType) => void
  onRemoteMode?: (type: SessionType) => void
}
const fingerprint = () => {
  const { currentSession: session, workDuration, shortBreak, longBreak, longBreakAfter } = useTimerStore.getState()
  return JSON.stringify([useAuthStore.getState().user?.id, session?.id, session?.status, session?.startedAt, session?.pausedAt, workDuration, shortBreak, longBreak, longBreakAfter])
}

/** The authenticated account owns the timer across browser tabs and extension. */
export function useSessionRestore(options: UseSessionRestoreOptions) {
  const latest = useRef(options)
  latest.current = options
  const userId = options.user && !options.user.isAnonymous ? options.user.id : null
  const completionAttempts = useRef(new Map<string, { retryAt: number; pending: boolean }>())
  const lastAppliedSnapshot = useRef<AccountTimerSnapshot | null>(null)
  const { data, mutate } = useSWR<AccountTimerSnapshot>(userId ? ['/api/timer', userId] : null, async () => {
    const localFingerprint = fingerprint()
    const startedBusy = latest.current.busy || isTimerSettingsSavePending()
    const token = useAuthStore.getState().token
    const response = await fetch('/api/timer', {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new Error(`Timer sync failed: ${response.status}`)
    return { ...await response.json(), localFingerprint, blockedDuringRequest: startedBusy || latest.current.busy || isTimerSettingsSavePending() }
  }, { refreshInterval: 5000, refreshWhenHidden: true, revalidateOnFocus: true, dedupingInterval: 1000 })

  useEffect(() => {
    if (!data || data.blockedDuringRequest || lastAppliedSnapshot.current === data || data.user.id !== userId || latest.current.busy || isTimerSettingsSavePending() || fingerprint() !== data.localFingerprint) return
    lastAppliedSnapshot.current = data
    const { user, restoreSession, setSessionType, emitSessionSync, ignoreSessionIdRef, onRemoteEnd, onRemoteMode } = latest.current
    if (!user) return
    const state = useTimerStore.getState()
    const current = state.currentSession
    if (current?.id.startsWith('temp_')) return
    const session = data.session
    const settings = data.user.settings
    const durationKeys = ['workDuration', 'shortBreak', 'longBreak', 'longBreakAfter'] as const
    if (settings && durationKeys.some(key => settings[key] !== user.settings?.[key])) {
      useAuthStore.getState().updateUserSettings(settings)
    }
    if (!session) {
      if (current && current.userId === user.id) {
        const completed = data.lastSession?.id === current.id && data.lastSession.status === SessionStatus.COMPLETED
        if (ignoreSessionIdRef) ignoreSessionIdRef.current = current.id
        sendMessageToServiceWorker({ type: 'STOP_TIMER' })
        onRemoteEnd?.(completed, current.type)
        if (useTimerStore.getState().currentSession?.id === current.id) state.cancelSession()
        window.dispatchEvent(new CustomEvent('session-completed'))
        void useAuthStore.getState().checkAuth()
      }
      return
    }
    // A fresh server read can reveal that a local stop failed to persist.
    if (session.id === ignoreSessionIdRef?.current) ignoreSessionIdRef.current = null
    const remaining = session.status === SessionStatus.PAUSED
      ? Math.max(0, session.remainingSeconds ?? session.duration * 60)
      : Math.max(0, session.duration * 60 - Math.floor((data.serverNow - new Date(session.startedAt).getTime()) / 1000))
    if (remaining === 0 && session.status === SessionStatus.ACTIVE) {
      const key = `${user.id}:${session.id}`
      const attempt = completionAttempts.current.get(key) ?? { retryAt: 0, pending: false }
      if (!attempt.pending && Date.now() >= attempt.retryAt) {
        attempt.pending = true
        completionAttempts.current.set(key, attempt)
        void sessionService.complete(session.id, session.updatedAt).then(() => mutate()).catch(() => {
          attempt.retryAt = Date.now() + 15000
        }).finally(() => { attempt.pending = false })
      }
      return
    }
    const changed = current?.id !== session.id || current.status !== session.status || current.startedAt !== session.startedAt || current.pausedAt !== session.pausedAt
    if (!changed) return
    restoreSession({ ...session, timeRemaining: remaining })
    setSessionType(session.type)
    onRemoteMode?.(session.type)
    if (session.status === SessionStatus.ACTIVE) {
      sendMessageToServiceWorker({ type: 'START_TIMER', payload: { sessionId: session.id, duration: session.duration, timeRemaining: remaining, startedAt: session.startedAt } })
    } else {
      sendMessageToServiceWorker({ type: 'STOP_TIMER' })
    }
    emitSessionSync({ ...session, username: user.username, avatarUrl: user.avatarUrl, timeRemaining: remaining })
  }, [data, userId, options.busy, mutate])

  const mutateSessions = useCallback(() => mutate(), [mutate])
  return { mutateSessions }
}
