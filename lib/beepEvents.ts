'use client'

import type { MouseEvent } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { beepActions, type BeepAction, type BeepSurface } from './beepEventTypes'

let visitId: string | undefined

export function logBeepEvent(action: BeepAction, surface: BeepSurface, step?: number) {
  // Never await analytics from an interaction or include message/field contents.
  try {
    if (!beepActions.includes(action)) return
    visitId ??= crypto.randomUUID()
    const token = useAuthStore.getState().token
    void fetch('/api/beep/events', {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ id: crypto.randomUUID(), visitId, action, surface, step: step ?? null, pagePath: window.location.pathname }),
    }).catch(() => { /* Analytics must not interrupt Beep. */ })
  } catch { /* Analytics is optional. */ }
}

export function logBeepClick(event: MouseEvent<HTMLElement>) {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-beep-action]') : null
  if (!target || target.closest('[data-beep-log-surface]') !== event.currentTarget || target.matches(':disabled, [aria-disabled="true"]')) return
  const action = target.dataset.beepAction as BeepAction
  if (!beepActions.includes(action)) return
  const surface = event.currentTarget.dataset.beepLogSurface as BeepSurface
  const step = event.currentTarget.dataset.beepLogStep
  logBeepEvent(action, surface, step === undefined ? undefined : Number(step))
}
