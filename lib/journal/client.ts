'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useI18n } from '@/components/I18nProvider'
export class ApiError extends Error {
  constructor(message: string, public field?: string, public status?: number) {
    super(message)
  }
}
export async function journalApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token
  const response = await fetch(`/api/journal/${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      ...(options.body instanceof FormData ? {} : {
        'Content-Type': 'application/json'
      }),
      ...(token ? {
        Authorization: `Bearer ${token}`
      } : {}),
      ...options.headers
    }
  })
  if (!response.ok) {
    const value: {
      error?: string;
      field?: string;
    } = await response.json().catch(() => ({}))
    throw new ApiError(value.error || 'Unable to complete the request. Try again.', value.field, response.status)
  }
  return (response.json() as Promise<T>)
}
export function useJournalText() {
  const {
    language
  } = useI18n()
  return (en: string, es: string) => language === 'es' ? es : en
}
export function useJournalQuery<T>(path: string | null) {
  const token = useAuthStore(s => s.token)
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(Boolean(path)),
    [version, setVersion] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setData(null)
    setError('')
    setLoading(Boolean(path))
    if (path) journalApi<T>(path, {
      signal: controller.signal
    }).then(value => {
      if (!controller.signal.aborted) setData(value)
    }).catch(e => {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Request failed')
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [path, token, version])
  const reload = useCallback(() => setVersion(v => v + 1), [])
  return {
    data,
    error,
    loading,
    reload,
    setData
  }
}
export function useJournalMutation() {
  const lock = useRef(false),
    errorRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [field, setField] = useState<string | undefined>(),
    [success, setSuccess] = useState('')
  const run = async (action: () => Promise<void>, message?: string) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    setField(undefined)
    try {
      await action()
      if (message) {
        setSuccess(message)
        window.dispatchEvent(new CustomEvent('journal-feedback', {
          detail: message
        }))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
      setField(e instanceof ApiError ? e.field : undefined)
      requestAnimationFrame(() => errorRef.current?.focus())
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return {
    busy,
    error,
    field,
    success,
    setSuccess,
    errorRef,
    run
  }
}
export function useUnsaved(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const listener = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', listener)
    return () => window.removeEventListener('beforeunload', listener)
  }, [dirty])
}
