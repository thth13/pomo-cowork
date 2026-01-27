'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, MessageCircle } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'

const DEFAULT_MESSAGE = 'Help us get better'
const SEEN_KEY = 'feedback_widget_seen'
const PROMPT_ANIM_MS = 300

export default function FeedbackWidget() {
  const { user, isAuthenticated, token } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [promptMounted, setPromptMounted] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const widgetRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = localStorage.getItem(SEEN_KEY)
    if (seen) return
    setPromptMounted(true)
    requestAnimationFrame(() => setShowPrompt(true))
    const timer = window.setTimeout(() => {
      setShowPrompt(false)
      localStorage.setItem(SEEN_KEY, '1')
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

      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        setError(payload?.error || 'Failed to send message. Try again later.')
        return
      }

      setSuccess(true)
      setMessage('')
    } catch (err) {
      setError('Failed to send message. Try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    setOpen(true)
    setError(null)
    if (typeof window !== 'undefined') {
      localStorage.setItem(SEEN_KEY, '1')
    }
    setShowPrompt(false)
  }

  const handleClose = useCallback(() => {
    setClosing(true)
    setError(null)
    setSuccess(false)
    window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, 180)
  }, [])

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
    <div ref={widgetRef} className="fixed bottom-6 right-6 z-50 flex items-end justify-end">
      <div className="relative">
        {promptMounted && !open && (
          <div
            className={`absolute bottom-16 right-0 mb-2 w-64 rounded-2xl border border-rose-100 bg-white px-3 py-2 text-sm text-gray-700 shadow-xl transition-all duration-300 ${
              showPrompt ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            } dark:border-rose-900/40 dark:bg-slate-900 dark:text-slate-200`}
          >
            Help us get better. Share ideas or report bugs.
          </div>
        )}
        {open && (
          <div className={`absolute bottom-16 right-0 w-[320px] rounded-2xl border border-rose-100 bg-white shadow-2xl dark:border-rose-900/40 dark:bg-slate-900 ${closing ? 'feedback-pop-out' : 'feedback-pop'}`}>
            <div className="flex items-start justify-between gap-3 border-b border-rose-100/70 px-4 pb-3 pt-4 dark:border-rose-900/40">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-500 dark:text-rose-300">
                  {DEFAULT_MESSAGE}
                </p>
                <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                  Share ideas or report bugs
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full p-1 text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white"
                aria-label="Collapse"
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="px-4 pt-3">
              <div className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                We read every note. Tell us what to improve, or share any bug you found.
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-4 pb-4 pt-3 space-y-3">
              <textarea
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value)
                  if (error) setError(null)
                  if (success) setSuccess(false)
                }}
                className="min-h-[120px] w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-rose-400 focus:outline-none dark:border-rose-900/50 dark:bg-slate-950 dark:text-white"
                placeholder="Write your suggestion or bug report..."
                required
              />

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  Thanks! Your message was sent to support.
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="inline-flex items-center justify-center rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-rose-600 disabled:opacity-60"
                >
                  {loading ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        )}

        <button
          type="button"
          onClick={open ? handleClose : handleOpen}
          className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-600 text-white shadow-lg shadow-slate-900/25 transition hover:scale-[1.02] focus:outline-none sm:h-14 sm:w-14"
          aria-label="Open feedback"
        >
          <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" stroke="none" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
