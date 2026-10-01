'use client'

import { useRef, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useI18n } from '@/components/I18nProvider'
import { previousMonthStart } from '@/lib/wrapped/analytics'
import { useWrapped } from './WrappedProvider'

// Temporary debug control, deliberately visible to everyone.
export default function ResetWrappedNotificationButton() {
  const { language } = useI18n()
  const wrapped = useWrapped()
  const busy = useRef(false)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const copy = language === 'es' ? {
    label: 'Debug: reiniciar aviso mensual', signIn: 'Inicia sesión para reiniciar tu aviso.',
    empty: 'No hay actividad el mes pasado para mostrar el aviso.',
    success: 'Aviso reiniciado.', error: 'No se pudo reiniciar. Inténtalo de nuevo.',
  } : {
    label: 'Debug: reset monthly notification', signIn: 'Sign in to reset your notification.',
    empty: 'No focus activity last month to show a notification for.',
    success: 'Notification reset.', error: 'Reset failed. Please try again.',
  }

  const reset = async () => {
    if (busy.current) return
    const token = useAuthStore.getState().token
    if (!token) { setMessage(copy.signIn); return }
    busy.current = true
    setPending(true)
    setMessage('')
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const response = await fetch('/api/wrapped', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthStart: previousMonthStart(timezone), action: 'reset-notification' }),
        signal: AbortSignal.timeout(20_000),
      })
      if (!response.ok) throw new Error('Reset failed')
      const data: { reset?: boolean } = await response.json()
      if (useAuthStore.getState().token !== token) return
      setMessage(data.reset ? copy.success : copy.empty)
      if (data.reset) {
        window.dispatchEvent(new Event('notifications-updated'))
        wrapped?.refresh()
      }
    } catch { setMessage(copy.error) }
    finally { busy.current = false; setPending(false) }
  }

  return <div className="fixed bottom-3 left-3 z-30 max-w-[calc(100vw-1.5rem)]" data-no-translate>
    <button type="button" className="btn-secondary cursor-pointer text-xs active:translate-y-px" disabled={pending} aria-busy={pending} onClick={() => { void reset() }}>
      {copy.label}
    </button>
    <p role="status" className="mt-1 text-xs bg-[var(--pixel-paper)] text-[var(--pixel-ink)]">{message}</p>
  </div>
}
