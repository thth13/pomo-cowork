'use client'

import { useEffect, useRef, useState } from 'react'

export type StudyTimerSnapshot = {
  status: 'idle' | 'running' | 'paused' | 'finished'
  remainingMs: number
  endsAt: number | null
}

/** Each mount owns its clock; callers may supply a validated restoration snapshot. */
export function useLocalStudyTimer(initialSeconds: number, countUp = false, restored?: StudyTimerSnapshot | null) {
  const initial = useRef<StudyTimerSnapshot | null>(null)
  if (!initial.current) {
    const value = restored?.status === 'running' && restored.endsAt !== null
      ? Math.max(0, restored.endsAt - Date.now()) : restored?.remainingMs ?? initialSeconds * 1000
    initial.current = { remainingMs: value, status: restored?.status === 'running' && value === 0 ? 'finished' : restored?.status ?? 'idle', endsAt: restored?.endsAt ?? null }
  }
  const [remainingMs, setRemainingMs] = useState(initial.current.remainingMs)
  const [status, setStatus] = useState<StudyTimerSnapshot['status']>(initial.current.status)
  const clock = useRef({ at: Date.now(), value: initial.current.remainingMs, running: initial.current.status === 'running' })

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

  const snapshot: StudyTimerSnapshot = {
    status, remainingMs: clock.current.value,
    endsAt: status === 'running' ? clock.current.at + clock.current.value : null,
  }
  return { snapshot, seconds: countUp ? Math.floor(remainingMs / 1000) : Math.ceil(remainingMs / 1000), status, start, pause, reset, finish }
}
