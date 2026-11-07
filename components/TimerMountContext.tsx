'use client'

import { createContext, useContext, useLayoutEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import type { PomodoroTimerProps } from './PomodoroTimer'

export interface TimerMount {
  target: HTMLDivElement
  props: PomodoroTimerProps
  href: string
}

export const TimerMountContext = createContext<((mount: TimerMount) => () => void) | null>(null)

export function TimerSlot(props: PomodoroTimerProps) {
  const register = useContext(TimerMountContext)
  const target = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useLayoutEffect(() => {
    if (!register || !target.current) return
    return register({ target: target.current, props, href: `${pathname}${window.location.search}` })
  }, [register, props, pathname])

  return <div ref={target} className="persistent-timer-slot" style={{ width: '100%' }} />
}
