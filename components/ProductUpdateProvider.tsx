'use client'

import { useEffect, useState } from 'react'
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
  const [visible, setVisible] = useState<(OpenProductUpdateDetail & { owner: string | null }) | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [retry, setRetry] = useState(0)
  const active = visible?.owner === token ? visible : null
  const update = getProductUpdate(active?.updateId)
  const copy = productUpdateCopy[language]

  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<OpenProductUpdateDetail>).detail
      if (!detail || typeof detail.updateId !== 'string') return
      setStatus('idle')
      setVisible({ updateId: detail.updateId, notificationId: typeof detail.notificationId === 'string' ? detail.notificationId : undefined, owner: useAuthStore.getState().token })
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

  if (!active) return null
  return <CommunityDialog open variant="product-update" title={copy.label}
    description={update?.summary[language]} onClose={() => setVisible(null)}>
    <div className="product-update-scroll">
      {update ? update.sections.map((section, index) => <section className="product-update-section" key={index}>
        {section.image && <Image className="product-update-image" src={section.image} alt={section.imageAlt?.[language] ?? ''} width={1200} height={600} />}
        <h3>{section.title[language]}</h3>
        <p>{section.body[language]}</p>
        {section.actions && <div className="product-update-actions">
          {section.actions.map(action => <Link key={action.href} href={action.href}
            className={`community-button${action.primary ? ' community-button-primary' : ''}`}
            onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) setVisible(null) }}>
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
      <button type="button" className="community-button" onClick={() => setVisible(null)}>{copy.done}</button>
    </footer>
  </CommunityDialog>
}
