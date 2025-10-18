import { useEffect } from 'react'
import { PomodoroSession } from '@/types'
import { useTimerStore } from '@/store/useTimerStore'
import { sendMessageToServiceWorker, listenToServiceWorker } from '@/lib/serviceWorker'

interface UseTimerSyncOptions {
  currentSession: PomodoroSession | null
  isRunning: boolean
  onSessionComplete: () => void
  emitTimerTick: (sessionId: string, timeRemaining: number) => void
}

/**
 * Keeps the timer state synchronized between the UI and the Service Worker.
 */
export function useTimerSync({
  currentSession,
  isRunning,
  onSessionComplete,
  emitTimerTick,
}: UseTimerSyncOptions) {
  useEffect(() => {
    const unsubscribe = listenToServiceWorker((message) => {
      const { type, payload } = message

      switch (type) {
        case 'TIMER_TICK':
          if (currentSession && payload.sessionId === currentSession.id) {
            useTimerStore.setState({ timeRemaining: payload.timeRemaining })

            if (payload.timeRemaining % 30 === 0) {
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
    if (!currentSession) {
      return
    }

    sendMessageToServiceWorker({ type: 'GET_STATE' })
  }, [currentSession?.id])

  useEffect(() => {
    let localInterval: NodeJS.Timeout | undefined
    let syncInterval: NodeJS.Timeout | undefined

    if (isRunning && currentSession) {
      localInterval = setInterval(() => {
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

      syncInterval = setInterval(() => {
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
      if (localInterval) clearInterval(localInterval)
      if (syncInterval) clearInterval(syncInterval)
    }
  }, [isRunning, currentSession?.id, onSessionComplete, currentSession])
}
