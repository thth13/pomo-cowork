'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'

export default function CommunityDialog({ open, title, description, busy = false, variant = 'default', dismissOnBackdrop = false, onClose, children }: {
  open: boolean
  title: string
  description?: string
  busy?: boolean
  variant?: 'default' | 'timer-settings'
  dismissOnBackdrop?: boolean
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const backdropPress = useRef(false)
  const headingId = useId()
  const descriptionId = useId()
  const { t, language } = useI18n()
  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger?.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [open])
  return <dialog ref={ref} className={`community-dialog${variant === 'timer-settings' ? ' timer-settings-dialog' : ''}`} aria-labelledby={headingId} aria-describedby={description ? descriptionId : undefined} lang={language} data-no-translate
    onMouseDown={event => { backdropPress.current = event.target === event.currentTarget }}
    onClick={event => {
      if (dismissOnBackdrop && !busy && backdropPress.current && event.target === event.currentTarget) onClose()
      backdropPress.current = false
    }}
    onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <header className="community-dialog-heading">
      <div><h2 id={headingId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div>
      <button type="button" className="community-icon-button" onClick={onClose} disabled={busy} aria-label={t.common.close}><X size={18} aria-hidden="true" /></button>
    </header>
    <div className="community-dialog-body">{open && children}</div>
  </dialog>
}
