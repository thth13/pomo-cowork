'use client'

import { useEffect, useRef, useState } from 'react'
import AuthModal from '@/components/AuthModal'
import { useAuthStore } from '@/store/useAuthStore'
import { useI18n } from '@/components/I18nProvider'
import { extensionAuthCopy } from '@/lib/i18n/extension'
import { POMO_EXTENSION_ID } from '@/lib/extensionIdentity'

interface ExternalRuntime {
  sendMessage: (extensionId: string, message: unknown, callback: (result?: { success?: boolean }) => void) => void
  lastError?: { message?: string }
}

export default function ExtensionAuthorizePage() {
  const { user, token, isLoading } = useAuthStore()
  const { language } = useI18n()
  const copy = extensionAuthCopy[language]
  const [request, setRequest] = useState<{ extensionId: string; requestId: string } | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [status, setStatus] = useState<'ready' | 'pending' | 'done' | 'error'>('ready')
  const [invalid, setInvalid] = useState(false)
  const pending = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const extensionId = params.get('extensionId') ?? ''
    const requestId = params.get('requestId') ?? ''
    if (extensionId !== POMO_EXTENSION_ID || !/^[\da-f-]{36}$/i.test(requestId)) { setInvalid(true); return }
    setRequest({ extensionId, requestId })
  }, [])
  useEffect(() => { document.title = `${status === 'done' ? copy.done : copy.title} | Pomo Cowork` }, [copy.title, copy.done, status])
  useEffect(() => { if (user && !user.isAnonymous) setShowLogin(false) }, [user])

  const authorize = () => {
    if (pending.current || !request || !token || !user || user.isAnonymous) return
    const runtime = (window as Window & { chrome?: { runtime?: ExternalRuntime } }).chrome?.runtime
    if (!runtime) { setStatus('error'); return }
    pending.current = true
    setStatus('pending')
    const timeout = window.setTimeout(() => { pending.current = false; setStatus('error') }, 20000)
    try {
      runtime.sendMessage(request.extensionId, { source: 'pomo:account:authorize', requestId: request.requestId, token, language }, result => {
        window.clearTimeout(timeout)
        pending.current = false
        setStatus(!runtime.lastError && result?.success ? 'done' : 'error')
      })
    } catch {
      window.clearTimeout(timeout)
      pending.current = false
      setStatus('error')
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-5 px-6 py-16">
      <p className="font-semibold text-sm text-[var(--pixel-muted)]">Pomo Co · Chrome</p>
      <h1 className="text-2xl font-semibold">{copy.title}</h1>
      {status !== 'done' && <p>{copy.description}</p>}
      {invalid ? <p role="alert">{copy.invalid}</p> : isLoading ? <p role="status">{copy.loading}</p> : status === 'done' ? (
        <div role="status" className="flex items-start gap-3 rounded-sm border border-green-300 bg-green-100 p-5 text-green-900 dark:border-green-700 dark:bg-green-900 dark:text-green-100">
          <svg aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m5 12 4 4L19 6" />
          </svg>
          <div>
            <p className="text-lg font-semibold">{copy.done}</p>
            <p className="mt-1 text-sm">{copy.doneHint}</p>
          </div>
        </div>
      ) : user && !user.isAnonymous ? (
        <>
          <p className="font-semibold break-words">{user.username}</p>
          <button type="button" className="btn btn-primary" onClick={authorize} disabled={status === 'pending' || !request} aria-busy={status === 'pending'}>
            {status === 'pending' ? copy.loading : copy.continue}
          </button>
        </>
      ) : <button type="button" className="btn btn-primary" onClick={() => setShowLogin(true)} disabled={!request}>{copy.signIn}</button>}
      {status === 'error' && <p role="alert">{copy.failed}</p>}
      <AuthModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </main>
  )
}
