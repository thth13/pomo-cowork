'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'

interface SupportFormState {
  name: string
  email: string
  subject: string
  message: string
}

const initialState: SupportFormState = {
  name: '',
  email: '',
  subject: '',
  message: '',
}

interface SupportContactProps {
  triggerLabel?: string
  triggerClassName?: string
  wrapperClassName?: string
  inline?: boolean
}

export default function SupportContact({
  triggerLabel = 'Contact support',
  triggerClassName = 'text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300',
  wrapperClassName,
  inline = false
}: SupportContactProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<SupportFormState>(initialState)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return form.message.trim().length > 0
  }, [form.message])

  const updateField = (field: keyof SupportFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (error) setError(null)
    if (success) setSuccess(false)
  }

  const handleClose = () => {
    setOpen(false)
    setError(null)
    setSuccess(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canSubmit || loading) return

    setLoading(true)
    setError(null)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: form.name.trim() || undefined,
          email: form.email.trim() || undefined,
          subject: form.subject.trim() || undefined,
          message: form.message.trim(),
        }),
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        setError(payload?.error || 'Failed to send message. Try again later.')
        return
      }

      setSuccess(true)
      setForm(initialState)
    } catch (err) {
      setError('Failed to send message. Try again later.')
    } finally {
      setLoading(false)
    }
  }

  const Wrapper = inline ? 'span' : 'div'
  const resolvedWrapperClassName = wrapperClassName ?? (inline ? 'inline' : 'space-y-3')

  return (
    <Wrapper className={resolvedWrapperClassName}>
      <a
        href="#"
        onClick={(event) => {
          event.preventDefault()
          setOpen(true)
        }}
        className={triggerClassName}
      >
        {triggerLabel}
      </a>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Support request</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Tell us what went wrong. Leave an email if you want a reply.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md px-2 py-1 text-sm text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-slate-200">
                  Name
                  <input
                    value={form.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    placeholder="Your name"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-slate-200">
                  Email (optional)
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    placeholder="you@example.com"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-slate-200">
                Subject
                <input
                  value={form.subject}
                  onChange={(event) => updateField('subject', event.target.value)}
                  className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  placeholder="Billing, bug report, feature request"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-slate-200">
                Message
                <textarea
                  required
                  value={form.message}
                  onChange={(event) => updateField('message', event.target.value)}
                  className="min-h-[140px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  placeholder="Describe the issue in detail."
                />
              </label>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  Thanks! Your message has been sent.
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  We typically respond within 1–2 business days.
                </p>
                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-600 disabled:opacity-60"
                >
                  {loading ? 'Sending…' : 'Send message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Wrapper>
  )
}
