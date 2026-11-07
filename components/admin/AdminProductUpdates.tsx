'use client'

import { useEffect, useRef, useState } from 'react'
import { Eye, Send } from 'lucide-react'
import CommunityDialog from '@/components/CommunityDialog'
import { useAdminData } from '@/components/admin/useAdminData'
import { openProductUpdate, PRODUCT_UPDATES } from '@/lib/productUpdates'
import { useAuthStore } from '@/store/useAuthStore'

interface DeliveryStatus { users: number; updates: { id: string; sent: number }[] }

export default function AdminProductUpdates() {
  const { data, loading, error, refresh } = useAdminData<DeliveryStatus>('/api/admin/product-updates')
  const token = useAuthStore(state => state.token)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ owner: string | null; error: boolean; message: string } | null>(null)
  const request = useRef<AbortController | null>(null)
  const selection = PRODUCT_UPDATES.find(update => update.id === selectedId)
  const remaining = selectedId && data ? Math.max(0, data.users - (data.updates.find(update => update.id === selectedId)?.sent ?? 0)) : 0
  useEffect(() => {
    setSelectedId(null); setBusy(false)
    return () => { request.current?.abort(); request.current = null }
  }, [token])

  async function send() {
    if (!selection || !token || request.current) return
    const controller = new AbortController()
    request.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 30_000)
    setBusy(true); setFeedback(null)
    try {
      const response = await fetch('/api/admin/product-updates', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ updateId: selection.id, confirm: true }), signal: controller.signal,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not send this update.')
      if (useAuthStore.getState().token !== token || request.current !== controller) return
      setFeedback({ owner: token, error: false, message: `Sent ${result.sent} notification${result.sent === 1 ? '' : 's'}. Existing recipients were not notified again.` })
      setSelectedId(null)
      window.dispatchEvent(new Event('notifications-updated'))
      refresh()
    } catch (failure) {
      if (useAuthStore.getState().token !== token || request.current !== controller) return
      setFeedback({ owner: token, error: true, message: controller.signal.aborted ? 'Delivery confirmation timed out. Refresh the status before retrying. Repeated requests do not create duplicates.' : failure instanceof Error ? failure.message : 'Could not send this update.' })
      refresh()
    } finally {
      window.clearTimeout(timeout)
      if (request.current === controller) { request.current = null; setBusy(false) }
    }
  }

  return <div className="admin-update-list">
    {loading && <p role="status">Loading delivery status…</p>}
    {error && <div role="alert"><p>{error}</p><button type="button" className="community-button" onClick={refresh}>Try again</button></div>}
    {feedback?.owner === token && !selectedId && <p role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p>}
    {PRODUCT_UPDATES.map(update => {
      const sent = data?.updates.find(item => item.id === update.id)?.sent ?? 0
      const pending = data ? Math.max(0, data.users - sent) : 0
      return <article key={update.id} className="admin-overview-panel admin-update-card">
        <h2>{update.title.en}</h2><p>{update.summary.en}</p>
        <p>{update.id}</p>
        {data && <p>{sent.toLocaleString()} sent · {pending.toLocaleString()} registered accounts not yet notified</p>}
        <div className="admin-update-actions">
          <button type="button" className="community-button" disabled={busy} onClick={() => openProductUpdate({ updateId: update.id })}><Eye size={16} aria-hidden="true" />Preview update</button>
          <button type="button" className="community-button" disabled={busy || loading || !data || pending === 0} onClick={() => { setFeedback(null); setSelectedId(update.id) }}><Send size={16} aria-hidden="true" />Send notification</button>
        </div>
      </article>
    })}
    <CommunityDialog open={Boolean(selection)} title="Send this update?" busy={busy} onClose={() => setSelectedId(null)}>
      <p><strong>{selection?.title.en}</strong></p>
      <p>This sends an in-app notification to {remaining.toLocaleString()} registered accounts that have not received this update. Opening the notification shows the illustrated update. No email or push notification is sent.</p>
      {feedback?.owner === token && feedback.error && <p role="alert">{feedback.message}</p>}
      <div className="community-dialog-actions">
        <button type="button" className="community-button" disabled={busy} onClick={() => setSelectedId(null)}>Cancel</button>
        <button type="button" className="community-button" disabled={busy || loading || !data || remaining === 0} onClick={() => void send()}>{busy ? 'Sending…' : 'Send notification'}</button>
      </div>
    </CommunityDialog>
  </div>
}
