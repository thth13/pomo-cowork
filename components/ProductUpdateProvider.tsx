'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Plus } from 'lucide-react'
import CommunityDialog from '@/components/CommunityDialog'
import { useI18n } from '@/components/I18nProvider'
import { useAuthStore } from '@/store/useAuthStore'
import { getProductUpdate, OPEN_PRODUCT_UPDATE, productUpdateCopy, type OpenProductUpdateDetail } from '@/lib/productUpdates'

export default function ProductUpdateProvider() {
  const { language } = useI18n()
  const token = useAuthStore(state => state.token)
  const [visible, setVisible] = useState<(OpenProductUpdateDetail & { owner: string | null; sessionId: string }) | null>(null)
  const recorded = useRef(new Set<string>())
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [retry, setRetry] = useState(0)
  const active = visible?.owner === token ? visible : null
  const update = getProductUpdate(active?.updateId)
  const copy = productUpdateCopy[language]

  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<OpenProductUpdateDetail>).detail
      if (!detail || typeof detail.updateId !== 'string') return
      recorded.current.clear()
      setStatus('idle')
      setVisible({ updateId: detail.updateId, notificationId: typeof detail.notificationId === 'string' ? detail.notificationId : undefined, owner: useAuthStore.getState().token, sessionId: crypto.randomUUID() })
    }
    window.addEventListener(OPEN_PRODUCT_UPDATE, open)
    return () => window.removeEventListener(OPEN_PRODUCT_UPDATE, open)
  }, [])

  useEffect(() => {
    if (!active?.notificationId || !update || !token) return
    const controller = new AbortController()
    let disposed = false
    const timeout = window.setTimeout(() => controller.abort(), 20_000)
    setStatus('saving')
    void fetch(`/api/notifications/${encodeURIComponent(active.notificationId)}`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }), signal: controller.signal,
    }).then(response => {
      if (!response.ok) throw new Error('Unable to mark notification read')
      if (disposed || useAuthStore.getState().token !== token) return
      setStatus('idle')
      window.dispatchEvent(new Event('notifications-updated'))
    }).catch(() => { if (!disposed) setStatus('error') })
      .finally(() => window.clearTimeout(timeout))
    return () => { disposed = true; controller.abort(); window.clearTimeout(timeout) }
  }, [active, update, token, retry])

  function record(action: 'scrolled_to_end' | 'closed') {
    if (!active?.notificationId || !update || !token || useAuthStore.getState().token !== token || recorded.current.has(action)) return
    recorded.current.add(action)
    const body = JSON.stringify({ updateId: update.id, notificationId: active.notificationId, sessionId: active.sessionId, action })
    // Keep the request alive when a release link navigates away. Retrying uses
    // the same session/action key, so an uncertain response cannot duplicate it.
    void (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (useAuthStore.getState().token !== token) return
        const controller = new AbortController()
        const timeout = window.setTimeout(() => controller.abort(), 10_000)
        try {
          const response = await fetch('/api/product-updates/events', {
            method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body, keepalive: true, signal: controller.signal,
          })
          if (response.ok || response.status < 500) return
        } catch { /* Retry once without blocking the dialog. */ }
        finally { window.clearTimeout(timeout) }
      }
    })()
  }

  function close() { record('closed'); setVisible(null) }

  if (!active) return null
  return <CommunityDialog open variant="product-update" title={copy.label}
    description={update?.summary[language]} onClose={close}>
    <div key={active.sessionId} className="product-update-scroll" onScroll={event => {
      const element = event.currentTarget
      if (element.scrollTop > 0 && element.scrollHeight - element.scrollTop - element.clientHeight <= 4) record('scrolled_to_end')
    }}>
      {update ? update.sections.map((section, index) => <section className="product-update-section" key={index}>
        {section.heading && <h3 className="product-update-section-heading">{section.heading[language]}</h3>}
        {section.headingImage && <Image className="product-update-brand-image" src={section.headingImage.src} alt={section.headingImage.alt[language]} width={section.headingImage.width} height={section.headingImage.height} />}
        {section.image && <Image className="product-update-image" src={section.image} alt={section.imageAlt?.[language] ?? ''} width={1200} height={600} />}
        {section.heading ? <h4>{section.title[language]}</h4> : <h3>{section.title[language]}</h3>}
        <p>{section.body[language]}</p>
        {section.actions && <div className="product-update-actions">
          {section.actions.map(action => <Link key={action.href} href={action.href}
            className={`community-button${action.primary ? ' community-button-primary' : ''}`}
            onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) close() }}>
            {action.primary ? <Plus size={17} aria-hidden="true" /> : <ArrowUpRight size={17} aria-hidden="true" />}
            {action.label[language]}
          </Link>)}
        </div>}
        {section.illustrations && <div className="product-update-illustrations">
          {section.illustrations.map(illustration => <figure key={illustration.src.en}>
            <Image className="product-update-image" src={illustration.src[language]} alt={illustration.alt[language]} width={illustration.width} height={illustration.height} />
            <figcaption>{illustration.caption[language]}</figcaption>
          </figure>)}
        </div>}
        <ul>{section.points.map((point, pointIndex) => <li key={pointIndex}><span>{point[language]}</span></li>)}</ul>
      </section>) : <p role="alert">{copy.unavailable}</p>}
    </div>
    <footer className="product-update-footer">
      <div aria-live="polite">
        {status === 'saving' && <p>{copy.saving}</p>}
        {status === 'error' && <><p>{copy.readError}</p><button type="button" className="product-update-retry" onClick={() => setRetry(value => value + 1)}>{copy.retry}</button></>}
      </div>
      <button type="button" className="community-button" onClick={close}>{copy.done}</button>
    </footer>
  </CommunityDialog>
}
