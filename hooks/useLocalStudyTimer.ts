'use client'

import { useEffect, useRef, useState } from 'react'

/** Each mount owns its clock. No stores, persistence, events, or session services. */
export function useLocalStudyTimer(initialSeconds: number, countUp = false) {
  const [remainingMs, setRemainingMs] = useState(initialSeconds * 1000)
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle')
  const clock = useRef({ at: 0, value: initialSeconds * 1000, running: false })

  const readClock = () => {
    const elapsed = Math.max(0, Date.now() - clock.current.at)
    return countUp ? clock.current.value + elapsed : Math.max(0, clock.current.value - elapsed)
  }

  useEffect(() => {
    if (status !== 'running') return
    const tick = () => {
      if (!clock.current.running) return
      const elapsed = Math.max(0, Date.now() - clock.current.at)
      const next = countUp ? clock.current.value + elapsed : Math.max(0, clock.current.value - elapsed)
      setRemainingMs(next)
      if (!countUp && next === 0) {
        clock.current = { at: 0, value: 0, running: false }
        setStatus('finished')
      }
    }
    tick()
    const interval = window.setInterval(tick, 200)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [status, countUp])

  const start = () => {
    if (clock.current.running || status === 'finished') return
    clock.current = { at: Date.now(), value: remainingMs, running: true }
    setStatus('running')
  }
  const pause = () => {
    if (!clock.current.running) return
    const value = readClock()
    clock.current = { at: 0, value, running: false }
    setRemainingMs(value)
    setStatus(!countUp && value === 0 ? 'finished' : 'paused')
  }
  const reset = (seconds = initialSeconds) => {
    clock.current = { at: 0, value: seconds * 1000, running: false }
    setRemainingMs(seconds * 1000)
    setStatus('idle')
  }
  const finish = () => {
    const value = clock.current.running ? readClock() : remainingMs
    clock.current = { at: 0, value, running: false }
    setRemainingMs(value)
    setStatus('finished')
  }

  return { seconds: countUp ? Math.floor(remainingMs / 1000) : Math.ceil(remainingMs / 1000), status, start, pause, reset, finish }
}
