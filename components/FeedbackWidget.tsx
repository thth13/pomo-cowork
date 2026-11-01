'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, MessageCircle, Send, X } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { feedbackCopy } from '@/lib/i18n/feedback'
import { useAuthStore } from '@/store/useAuthStore'

const SEEN_KEY = 'feedback_widget_seen'
const PROMPT_ANIM_MS = 300

export default function FeedbackWidget() {
  const { user, isAuthenticated, token } = useAuthStore()
  const { language } = useI18n()
  const copy = feedbackCopy[language]
  const [open, setOpen] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [promptMounted, setPromptMounted] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const widgetRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (localStorage.getItem(SEEN_KEY)) return
    } catch {
      // Feedback remains available when storage is blocked.
    }
    setPromptMounted(true)
    requestAnimationFrame(() => setShowPrompt(true))
    const timer = window.setTimeout(() => {
      setShowPrompt(false)
      try { localStorage.setItem(SEEN_KEY, '1') } catch { /* Optional prompt preference. */ }
    }, 20000)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!showPrompt && promptMounted) {
      const timer = window.setTimeout(() => {
        setPromptMounted(false)
      }, PROMPT_ANIM_MS)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [showPrompt, promptMounted])

  const canSubmit = useMemo(() => message.trim().length > 0, [message])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canSubmit || loading) return

    setLoading(true)
    setError(null)

    try {
      const authToken = token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null)

      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          subject: 'Website feedback',
          ...(isAuthenticated && user?.email ? { email: user.email } : {}),
          ...(isAuthenticated && user?.username ? { name: user.username } : {}),
          message: message.trim(),
        }),
      })

      if (!response.ok) {
        setError(copy.error)
        return
      }

      setSuccess(true)
      setMessage('')
    } catch (err) {
      setError(copy.error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    setOpen(true)
    setError(null)
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(SEEN_KEY, '1') } catch { /* Optional prompt preference. */ }
    }
    setShowPrompt(false)
  }

  const handleClose = useCallback(() => {
    if (widgetRef.current?.contains(document.activeElement)) {
      triggerRef.current?.focus({ preventScroll: true })
    }
    setOpen(false)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true })
  }, [open])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target || !widgetRef.current) return
      if (!widgetRef.current.contains(target)) {
        handleClose()
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [open, handleClose])

  return (
    <div ref={widgetRef} className="feedback-widget fixed bottom-6 right-6 z-50 flex items-end justify-end"
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.stopPropagation()
          handleClose()
        }
      }}>
      <div className="relative">
        {promptMounted && !open && (
          <div className={`feedback-prompt ${showPrompt ? 'feedback-prompt-visible' : ''}`}>
            {copy.prompt}
          </div>
        )}
        {open && (
          <section id="feedback-panel" role="dialog" aria-labelledby="feedback-title"
            aria-describedby="feedback-description" className="feedback-panel feedback-pop">
            <header className="feedback-header">
              <div className="feedback-heading">
                <MessageCircle size={16} aria-hidden="true" />
                <h2 id="feedback-title">{copy.title}</h2>
              </div>
              <button type="button" onClick={handleClose} className="feedback-close" aria-label={copy.close}>
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <form onSubmit={handleSubmit} noValidate className="feedback-form" aria-busy={loading}>
              <p id="feedback-description" className="feedback-description">{copy.description}</p>
              <label htmlFor="feedback-message" className="feedback-label">{copy.label}</label>
              <textarea id="feedback-message" ref={inputRef} value={message}
                onChange={(event) => {
                  setMessage(event.target.value)
                  if (error) setError(null)
                  if (success) setSuccess(false)
                }}
                className="feedback-input resize-none" placeholder={copy.placeholder}
                maxLength={4000} required disabled={loading}
                aria-describedby={error ? 'feedback-error' : 'feedback-description'} />
              {error && <p id="feedback-error" role="alert" className="feedback-status feedback-error">{error}</p>}
              {success && <p role="status" className="feedback-status feedback-success">
                <Check size={16} aria-hidden="true" />{copy.success}
              </p>}
              <button type="submit" disabled={!canSubmit || loading} className="feedback-send">
                <Send size={15} aria-hidden="true" />
                <span role="status">{loading ? copy.sending : copy.send}</span>
              </button>
            </form>
          </section>
        )}
        <button ref={triggerRef} type="button" onClick={open ? handleClose : handleOpen}
          className="feedback-trigger" aria-label={open ? copy.close : copy.open}
          aria-expanded={open} aria-controls={open ? 'feedback-panel' : undefined}
          aria-haspopup="dialog" title={open ? copy.close : copy.open}>
          {open ? <X size={21} aria-hidden="true" /> : <MessageCircle size={21} aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
