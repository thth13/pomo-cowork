'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { registerServiceWorker } from '@/lib/serviceWorker'
import { PomodoroTimerRuntime } from './PomodoroTimer'
import { TimerMountContext, type TimerMount } from './TimerMountContext'
import { TimerErrorBoundary } from './TimerErrorBoundary'

export default function PersistentTimerProvider({ children }: { children: ReactNode }) {
  const isLoading = useAuthStore(state => state.isLoading)
  const [ready, setReady] = useState(false)
  const [mount, setMount] = useState<TimerMount | null>(null)
  const [lastMount, setLastMount] = useState<TimerMount | null>(null)
  const register = useCallback((next: TimerMount) => {
    setMount(next)
    setLastMount(next)
    return () => setMount(current => current === next ? null : current)
  }, [])
  const active = mount ?? lastMount

  useEffect(() => {
    setReady(true)
    void registerServiceWorker()
  }, [])

  return (
    <TimerMountContext.Provider value={register}>
      {children}
      {ready && !isLoading && <TimerErrorBoundary>
        <PomodoroTimerRuntime {...active?.props} target={mount?.target} returnHref={active?.href ?? '/'} />
      </TimerErrorBoundary>}
    </TimerMountContext.Provider>
  )
}
