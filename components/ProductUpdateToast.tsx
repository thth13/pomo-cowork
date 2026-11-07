'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import NotificationToast from '@/components/NotificationToast'
import { useI18n } from '@/components/I18nProvider'
import { useAuthStore } from '@/store/useAuthStore'
import { getProductUpdate, OPEN_PRODUCT_UPDATE, openProductUpdate, productUpdateCopy } from '@/lib/productUpdates'
import type { NotificationItem } from '@/types'

type Inbox = { owner: string | null; notifications: NotificationItem[] }

export default function ProductUpdateToast() {
  const token = useAuthStore(state => state.token)
  const userId = useAuthStore(state => state.user?.id)
  const { language } = useI18n()
  const [inbox, setInbox] = useState<Inbox | null>(null)
  const [toast, setToast] = useState<{ owner: string; notification: NotificationItem } | null>(null)
  const shown = useRef(new Set<string>())
  const dismiss = useCallback(() => setToast(null), [])

  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<Inbox>).detail
      if (detail?.owner !== useAuthStore.getState().token || !Array.isArray(detail?.notifications)) return
      setInbox(detail)
      setToast(current => current && detail.notifications.some(item => item.id === current.notification.id) ? current : null)
    }
    window.addEventListener('notifications-loaded', receive)
    window.addEventListener(OPEN_PRODUCT_UPDATE, dismiss)
    return () => {
      window.removeEventListener('notifications-loaded', receive)
      window.removeEventListener(OPEN_PRODUCT_UPDATE, dismiss)
    }
  }, [dismiss])

  useEffect(() => {
    setInbox(null)
    setToast(null)
  }, [token])

  useEffect(() => {
    if (!token || !userId || inbox?.owner !== token || toast) return
    const check = () => {
      if (document.hidden || useAuthStore.getState().token !== token) return
      // Share the existing corner with rank/recap toasts and wait for dialogs.
      if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]:not([hidden]), .rank-toast')) return
      const notification = inbox.notifications.find(item => {
        if (item.type !== 'PRODUCT_UPDATE' || item.readAt || !getProductUpdate(item.productUpdateId)) return false
        const key = `product-update-toast:${userId}:${item.id}`
        if (shown.current.has(key)) return false
        try { if (localStorage.getItem(key)) return false } catch { /* Use memory when storage is unavailable. */ }
        return true
      })
      if (!notification) return
      const key = `product-update-toast:${userId}:${notification.id}`
      shown.current.add(key)
      try { localStorage.setItem(key, '1') } catch { /* Deduplication still works for this mount. */ }
      setToast({ owner: token, notification })
    }
    // Allow an exiting toast to release the corner before the next one.
    const interval = window.setInterval(check, 1000)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', check)
    }
  }, [token, userId, inbox, toast])

  const pending = toast?.owner === token ? toast.notification : null
  const update = getProductUpdate(pending?.productUpdateId)
  const copy = productUpdateCopy[language]

  return <NotificationToast variant="product-update" type="info" isVisible={!!pending && !!update}
    onClose={dismiss} duration={12000} notificationKey={pending?.id}
    title={copy.label} message={update?.title[language] ?? ''} description={update?.summary[language] ?? ''}
    icon={<Sparkles size={26} aria-hidden="true" />} accent="var(--pixel-growth)"
    action={<button type="button" className="wrapped-toast-action" onClick={() => {
      if (!pending?.productUpdateId) return
      openProductUpdate({ updateId: pending.productUpdateId, notificationId: pending.id })
    }}>{copy.open} →</button>} />
}
