import { useEffect } from 'react'
import { PomodoroSession } from '@/types'
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
            useTimerStore.setState({
              timeRemaining: payload.timeRemaining,
              isRunning: payload.isRunning,
            })
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
    const timerHost = timerWindow ?? window
    let localInterval: number | undefined
    let syncInterval: number | undefined

    if (isRunning && currentSession) {
      localInterval = timerHost.setInterval(() => {
        const { currentSession: storeSession, isRunning: storeIsRunning } = useTimerStore.getState()

        if (storeSession && storeIsRunning) {
          const startTime = new Date(storeSession.startedAt).getTime()
          const now = Date.now()
          const elapsed = Math.floor((now - startTime) / 1000)
          const totalDuration = storeSession.duration * 60
          const actualTimeRemaining = Math.max(0, totalDuration - elapsed)

          useTimerStore.setState({ timeRemaining: actualTimeRemaining })

          if (actualTimeRemaining === 0) {
            onSessionComplete()
          }
        }
      }, 1000)

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

    return () => {
      if (localInterval !== undefined) timerHost.clearInterval(localInterval)
      if (syncInterval !== undefined) timerHost.clearInterval(syncInterval)
    }
  }, [isRunning, currentSession?.id, onSessionComplete, currentSession, timerWindow])
}
