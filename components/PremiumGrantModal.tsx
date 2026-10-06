'use client'

import { useEffect, useRef, useState } from 'react'
import { Crown } from 'lucide-react'
import CommunityDialog from '@/components/CommunityDialog'
import { useI18n } from '@/components/I18nProvider'
import { premiumGrantCopy } from '@/lib/i18n/premiumGrant'
import { useAuthStore } from '@/store/useAuthStore'

interface PremiumNotification {
  id: string
  message: string
}

function AccountPremiumGrantModal({ token }: { token: string }) {
  const { language } = useI18n()
  const copy = premiumGrantCopy[language]
  const [notification, setNotification] = useState<PremiumNotification | null>(null)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const current = useRef<PremiumNotification | null>(null)
  const acknowledging = useRef(false)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => {
    const abort = new AbortController()
    controller.current = abort
    let loading = false
    async function load() {
      if (loading || current.current || document.hidden || abort.signal.aborted) return
      loading = true
      try {
        const response = await fetch('/api/notifications/premium', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          signal: abort.signal,
        })
        if (!response.ok) return
        const data = await response.json() as { notification: PremiumNotification | null }
        if (abort.signal.aborted || !data.notification) return
        current.current = data.notification
        setNotification(data.notification)
        // Refresh Pro status as well as displaying the admin's message.
        void useAuthStore.getState().checkAuth()
      } catch {
        // The persisted notification remains unread; retry on the next poll or focus.
      } finally {
        loading = false
      }
    }
    const refresh = () => { void load() }
    refresh()
    const interval = window.setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      abort.abort()
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [token])

  async function dismiss() {
    const abort = controller.current
    if (!current.current || acknowledging.current || !abort || abort.signal.aborted) return
    acknowledging.current = true
    setSaving(true)
    setFailed(false)
    try {
      const response = await fetch(`/api/notifications/${current.current.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
        signal: abort.signal,
      })
      if (!response.ok) throw new Error('Could not acknowledge premium notification')
      if (abort.signal.aborted) return
      current.current = null
      setNotification(null)
    } catch {
      if (!abort.signal.aborted) setFailed(true)
    } finally {
      acknowledging.current = false
      if (!abort.signal.aborted) setSaving(false)
    }
  }

  return (
    <CommunityDialog open={!!notification} title={copy.title} description={copy.description}
      busy={saving} onClose={() => { void dismiss() }}>
      <Crown size={32} className="mb-4 text-amber-500" aria-hidden="true" />
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{notification?.message}</p>
      {failed && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{copy.error}</p>}
      <div className="community-dialog-actions">
        <button type="button" className="community-button community-button-primary" disabled={saving}
          onClick={() => { void dismiss() }}>{saving ? copy.saving : copy.close}</button>
      </div>
    </CommunityDialog>
  )
}

export default function PremiumGrantModal() {
  const userId = useAuthStore(state => state.user?.id)
  const isAnonymous = useAuthStore(state => state.user?.isAnonymous)
  const token = useAuthStore(state => state.token)
  if (!userId || !token || isAnonymous) return null
  return <AccountPremiumGrantModal key={`${userId}:${token}`} token={token} />
}
