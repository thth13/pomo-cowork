'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '@/components/I18nProvider'

/** Shared fullscreen boundary: only the timer enters fullscreen, never the SEO guide. */
export default function FocusStage({ children }: { children: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [message, setMessage] = useState('')
  const { language } = useI18n()
  const es = language === 'es'

  useEffect(() => {
    const change = () => {
      const active = document.fullscreenElement === stage.current
      setExpanded(active)
      if (!active) trigger.current?.focus()
    }
    document.addEventListener('fullscreenchange', change)
    return () => { document.removeEventListener('fullscreenchange', change) }
  }, [])

  useEffect(() => {
    if (!expanded) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !stage.current?.querySelector('dialog[open]') && !document.fullscreenElement) {
        setExpanded(false)
        trigger.current?.focus()
      }
    }
    // The CSS fallback also keeps keyboard focus inside its visible stage.
    const focusin = (event: FocusEvent) => {
      if (event.target instanceof Node && !stage.current?.contains(event.target)) trigger.current?.focus()
    }
    document.addEventListener('keydown', keydown)
    document.addEventListener('focusin', focusin)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', keydown)
      document.removeEventListener('focusin', focusin)
    }
  }, [expanded])

  const toggle = async () => {
    setMessage('')
    if (expanded) {
      try {
        if (document.fullscreenElement === stage.current) await document.exitFullscreen()
        setExpanded(false)
      } catch {
        setMessage(es ? 'Pulsa Escape para salir de pantalla completa.' : 'Press Escape to exit fullscreen.')
      }
      trigger.current?.focus()
      return
    }
    try {
      if (!stage.current?.requestFullscreen) throw new Error('unsupported')
      await stage.current.requestFullscreen()
      setExpanded(true)
    } catch {
      setExpanded(true)
      setMessage(es ? 'Vista ampliada. El navegador no permite pantalla completa.' : 'Expanded view. Your browser does not allow fullscreen here.')
    }
  }

  return <div ref={stage} data-focus-stage role={expanded ? 'dialog' : undefined} aria-modal={expanded || undefined} aria-label={expanded ? (es ? 'Temporizador en pantalla completa' : 'Fullscreen timer') : undefined} className={`seo-focus-stage${expanded ? ' is-expanded' : ''}`}>
    <div className="seo-stage-toolbar">
      <button ref={trigger} type="button" className="seo-button" aria-pressed={expanded} onClick={toggle}>
        {expanded ? (es ? 'Salir de pantalla completa' : 'Exit fullscreen') : (es ? 'Pantalla completa' : 'Fullscreen')}
      </button>
    </div>
    <p className="seo-stage-message" role="status">{message}</p>
    {children}
  </div>
}
