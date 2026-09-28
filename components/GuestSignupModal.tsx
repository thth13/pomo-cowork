'use client'

import { useEffect, useId, useRef } from 'react'
import { BarChart3, X } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { gardenCopy } from '@/lib/i18n/garden'

interface GuestSignupModalProps {
  open: boolean
  onClose: () => void
  onSignUp: () => void
}

export default function GuestSignupModal({ open, onClose, onSignUp }: GuestSignupModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const { language, t } = useI18n()
  const copy = gardenCopy[language].guestSignup

  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return
    dialog.showModal()
    return () => dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="guest-signup-dialog"
      onCancel={onClose}
    >
      <button type="button" onClick={onClose} aria-label={t.common.close} className="guest-signup-close">
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
      <BarChart3 className="mb-5 h-8 w-8 text-[var(--pixel-growth)]" aria-hidden="true" />
      <h2 id={titleId} className="text-2xl font-semibold leading-tight">{copy.title}</h2>
      <p id={descriptionId} className="mb-6 mt-4 text-sm leading-relaxed text-[var(--pixel-muted)]">{copy.description}</p>
      <button type="button" autoFocus className="btn-primary min-h-11 w-full" onClick={() => {
        dialogRef.current?.close()
        onSignUp()
      }}>{copy.action}</button>
      <button type="button" className="btn-secondary mt-3 min-h-11 w-full" onClick={onClose}>{copy.later}</button>
    </dialog>
  )
}
