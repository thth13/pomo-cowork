'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { restoreGuestFlowTimer, useDailyFlowStore } from '@/store/useDailyFlowStore'
import { useTimerStore } from '@/store/useTimerStore'
import { getOrCreateAnonymousId } from '@/lib/anonymousUser'

/** Persistence and accounting stay mounted when the user leaves the Flow page. */
export default function DailyFlowPersistence() {
  const owner = useAuthStore(state => state.user?.id)
  const loading = useAuthStore(state => state.isLoading)
  useEffect(() => {
    if (loading) return
    const flow = useDailyFlowStore.getState()
    flow.syncTimer()
    let scope = owner
    if (!scope) {
      try { scope = getOrCreateAnonymousId() } catch { scope = `memory-guest-${crypto.randomUUID()}` }
    }
    flow.hydrate(scope)
    restoreGuestFlowTimer()
    useDailyFlowStore.getState().syncTimer()
    const unsubscribe = useTimerStore.subscribe((timer, previous) => {
      if (timer.currentSession !== previous.currentSession || timer.isRunning !== previous.isRunning || timer.timeRemaining !== previous.timeRemaining) {
        useDailyFlowStore.getState().syncTimer()
      }
    })
    const sync = () => useDailyFlowStore.getState().syncTimer()
    const interval = window.setInterval(sync, 5000)
    const onStorage = (event: StorageEvent) => {
      const state = useDailyFlowStore.getState()
      if (event.key === state.storageKey || event.key === null) {
        useDailyFlowStore.setState({ error: 'conflict', engaged: false })
      }
    }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      sync()
      if (useDailyFlowStore.getState().error === 'storage') event.preventDefault()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('pagehide', sync)
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('visibilitychange', sync)
    return () => {
      sync()
      unsubscribe()
      window.clearInterval(interval)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('pagehide', sync)
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [owner, loading])
  return null
}
