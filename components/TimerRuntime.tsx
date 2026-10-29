'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '@/components/I18nProvider'
import { useNotifications } from '@/hooks/useNotifications'
import { useSessionRestore } from '@/hooks/useSessionRestore'
import { useSocket } from '@/hooks/useSocket'
import { useTimerSync } from '@/hooks/useTimerSync'
import { getOrCreateAnonymousId } from '@/lib/anonymousUser'
import { sendMessageToServiceWorker } from '@/lib/serviceWorker'
import { sessionService } from '@/services/sessionService'
import { useAuthStore } from '@/store/useAuthStore'
import { usePetStore } from '@/store/usePetStore'
import { useTimerActionsStore } from '@/store/useTimerActionsStore'
import { useTimerStore } from '@/store/useTimerStore'
import { SessionStatus, SessionType } from '@/types'

function storedPreferences() {
  try {
    return JSON.parse(localStorage.getItem('pomodoro:preferences') ?? 'null') as {
      notificationEnabled?: boolean; soundEnabled?: boolean; soundVolume?: number
    } | null
  } catch { return null }
}

/** One timer clock and completion owner for every route in the application. */
export default function TimerRuntime() {
  const { t } = useI18n()
  const user = useAuthStore(state => state.user)
  const accountToken = useAuthStore(state => state.token)
  const currentSession = useTimerStore(state => state.currentSession)
  const isRunning = useTimerStore(state => state.isRunning)
  const busy = useTimerActionsStore(state => state.busy)
  const timerWindow = useTimerActionsStore(state => state.presentation?.timerWindow ?? null)
  const { emitSessionSync, emitSessionEnd, emitTimerTick } = useSocket()
  const [completing, setCompleting] = useState(false)
  const attemptRef = useRef<{ key: string; pending: boolean; retryAt: number } | null>(null)
  useEffect(() => {
    attemptRef.current = null
    setCompleting(false)
  }, [user?.id, accountToken])
  const preferences = storedPreferences()
  const { showNotification, playSound } = useNotifications(
    user?.settings?.notificationsEnabled ?? preferences?.notificationEnabled ?? true,
    user?.settings?.soundEnabled ?? preferences?.soundEnabled ?? true,
    user?.settings?.soundVolume ?? preferences?.soundVolume ?? 0.5,
  )

  const { mutateSessions } = useSessionRestore({
    user,
    currentSession,
    restoreSession: useTimerStore.getState().restoreSession,
    setSessionType: () => {},
    emitSessionSync,
    busy: busy || completing,
    onRemoteMode: type => useTimerActionsStore.getState().presentation?.onRemoteMode(type),
    onRemoteEnd: (completed, type) => {
      const timer = useTimerStore.getState()
      if (completed) timer.completeSession()
      else timer.cancelSession()
      useTimerActionsStore.getState().presentation?.onRemoteEnd(completed, type)
    },
  })

  useEffect(() => {
    if (user?.settings && !useTimerActionsStore.getState().presentation) useTimerStore.getState().setTimerSettings(user.settings)
  }, [user?.settings])

  const complete = useCallback(async () => {
    const timer = useTimerStore.getState()
    const session = timer.currentSession
    if (!session || !timer.isRunning || session.status !== SessionStatus.ACTIVE || useTimerActionsStore.getState().busy) return
    const endedAt = new Date(session.startedAt).getTime() + session.duration * 60000
    if (!Number.isFinite(endedAt) || endedAt > Date.now()) return
    const owner = useAuthStore.getState().user?.id ?? getOrCreateAnonymousId()
    const token = useAuthStore.getState().token
    if (session.userId !== owner) return
    const key = `${owner}:${session.id}:${session.startedAt}`
    const previous = attemptRef.current
    if (previous?.key === key && (previous.pending || previous.retryAt > Date.now())) return
    const attempt = { key, pending: true, retryAt: 0 }
    attemptRef.current = attempt
    setCompleting(true)
    const sameAccount = () => useAuthStore.getState().token === token &&
      (useAuthStore.getState().user?.id ?? getOrCreateAnonymousId()) === owner

    try {
      const result = await sessionService.complete(session.id, session.updatedAt, new Date(endedAt).toISOString())
      if (!sameAccount()) return
      const current = useTimerStore.getState().currentSession
      if (current?.id !== session.id || current.startedAt !== session.startedAt || current.status !== SessionStatus.ACTIVE) return
      if (result && (result.alreadyRemoved || result.status !== SessionStatus.COMPLETED)) {
        emitSessionEnd(session.id, 'manual')
        sendMessageToServiceWorker({ type: 'STOP_TIMER' })
        useTimerStore.getState().cancelSession()
        void mutateSessions()
        return
      }

      emitSessionEnd(session.id, 'completed')
      sendMessageToServiceWorker({ type: 'STOP_TIMER' })
      useTimerStore.getState().completeSession()
      void mutateSessions()

      if (result && (session.type === SessionType.WORK || session.type === SessionType.TIME_TRACKING)) {
        usePetStore.getState().reward(session.id, session.duration)
      }
      if (!sameAccount() || useTimerStore.getState().currentSession) return
      const presentation = useTimerActionsStore.getState().presentation
      if (presentation) {
        await presentation.onCompleted(session)
      } else {
        const title = session.type === SessionType.WORK ? t.timer.workCompleted
          : session.type === SessionType.SHORT_BREAK ? t.timer.shortBreakCompleted
          : session.type === SessionType.LONG_BREAK ? t.timer.longBreakCompleted : t.timer.completed
        showNotification(title, t.timer.nextSessionReady)
        playSound(session.type === SessionType.WORK ? 'start' : 'end')
      }
    } catch (error) {
      // Keep the active session at zero until its completion is saved. A failed
      // request must not lose focus time or trigger an automatic next session.
      attempt.retryAt = Date.now() + 15000
      console.error('Failed to complete timer session:', error)
      if (sameAccount()) void mutateSessions()
    } finally {
      attempt.pending = false
      if (attemptRef.current === attempt) setCompleting(false)
    }
  }, [emitSessionEnd, mutateSessions, playSound, showNotification, t.timer])

  useTimerSync({ currentSession, isRunning, timerWindow, emitTimerTick, onSessionComplete: complete })
  return null
}
