import { useEffect } from 'react'
import { PomodoroSession, SessionStatus } from '@/types'
import { useTimerStore } from '@/store/useTimerStore'
import { sendMessageToServiceWorker, listenToServiceWorker } from '@/lib/serviceWorker'

interface UseTimerSyncOptions {
  currentSession: PomodoroSession | null
  isRunning: boolean
  onSessionComplete: () => void
  emitTimerTick: (sessionId: string, timeRemaining: number) => void
  timerWindow?: Window | null
}

/**
 * Keeps the timer state synchronized between the UI and the Service Worker.
 */
export function useTimerSync({
  currentSession,
  isRunning,
  onSessionComplete,
  emitTimerTick,
  timerWindow,
}: UseTimerSyncOptions) {
  useEffect(() => {
    const unsubscribe = listenToServiceWorker((message) => {
      const { type, payload } = message
      const timer = useTimerStore.getState()
      if (!payload || !timer.currentSession || timer.currentSession.id !== payload.sessionId ||
          timer.currentSession.status !== SessionStatus.ACTIVE || !timer.isRunning) return

      switch (type) {
        case 'TIMER_TICK':
          if (currentSession && payload.sessionId === currentSession.id) {
            useTimerStore.setState({ timeRemaining: payload.timeRemaining })

            const isTempSession = currentSession.id.startsWith('temp_')

            if (!isTempSession && payload.timeRemaining % 30 === 0) {
              emitTimerTick(currentSession.id, payload.timeRemaining)
            }
          }
          break

        case 'TIMER_COMPLETE':
          if (payload.sessionId === currentSession?.id) {
            onSessionComplete()
          }
          break

        case 'TIMER_STATE':
          if (payload.isRunning && payload.sessionId === currentSession?.id) {
            useTimerStore.setState({ timeRemaining: payload.timeRemaining })
          }
          break
      }
    })

    return unsubscribe
  }, [currentSession?.id, emitTimerTick, onSessionComplete, currentSession])

  useEffect(() => {
    if (!currentSession?.id) {
      return
    }

    sendMessageToServiceWorker({ type: 'GET_STATE' })
  }, [currentSession?.id])

  useEffect(() => {
    // Use the visible mini-window's clock when the main tab is in the background.
    // There is still only one interval pair and one shared timer state.
    const timerHost = timerWindow && !timerWindow.closed ? timerWindow : window
    let localInterval: number | undefined
    let syncInterval: number | undefined

    const tick = () => {
      const { currentSession: storeSession, isRunning: storeIsRunning } = useTimerStore.getState()
      if (storeSession?.status === SessionStatus.ACTIVE && storeIsRunning) {
        const startTime = new Date(storeSession.startedAt).getTime()
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        const actualTimeRemaining = Math.max(0, storeSession.duration * 60 - elapsed)
        useTimerStore.setState({ timeRemaining: actualTimeRemaining })
        if (actualTimeRemaining === 0) {
          onSessionComplete()
        }
      }
    }
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }

    if (isRunning && currentSession) {
      tick()
      localInterval = timerHost.setInterval(tick, 1000)

      syncInterval = timerHost.setInterval(() => {
        const { currentSession: storeSession, isRunning: storeIsRunning } = useTimerStore.getState()

        if (storeSession && storeIsRunning) {
          const startTime = new Date(storeSession.startedAt).getTime()
          const now = Date.now()
          const elapsed = Math.floor((now - startTime) / 1000)
          const totalDuration = storeSession.duration * 60
          const actualTimeRemaining = Math.max(0, totalDuration - elapsed)

          sendMessageToServiceWorker({
            type: 'SYNC_TIME',
            payload: {
              timeRemaining: actualTimeRemaining,
              isRunning: storeIsRunning,
            },
          })
        }
      }, 5000)
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    window.addEventListener('online', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.removeEventListener('online', onVisible)
      if (localInterval !== undefined) timerHost.clearInterval(localInterval)
      if (syncInterval !== undefined) timerHost.clearInterval(syncInterval)
    }
  }, [isRunning, currentSession?.id, onSessionComplete, currentSession, timerWindow])
}
