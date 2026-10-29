'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'

export function useAdminData<T>(url: string, body?: string, enabled = true) {
  const token = useAuthStore(state => state.token)
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{ key: string; data: T | null; error: string | null; loading: boolean }>({ key: '', data: null, error: null, loading: true })
  const key = JSON.stringify([url, body, token, revision])
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    let disposed = false
    setResult({ key, data: null, error: null, loading: true })
    const timeout = window.setTimeout(() => controller.abort(), 20000)
    // Coalesce rapid presence updates; stale responses never replace current rows.
    const debounce = window.setTimeout(async () => {
      try {
        const authToken = token ?? localStorage.getItem('token')
        const response = await fetch(url, {
          method: body ? 'POST' : 'GET', body,
          headers: { Authorization: authToken ? `Bearer ${authToken}` : '', ...(body ? { 'Content-Type': 'application/json' } : {}) },
          signal: controller.signal, cache: 'no-store',
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not load data. Please retry.')
        if (!disposed) setResult({ key, data, error: null, loading: false })
      } catch (error) {
        if (!disposed) setResult({ key, data: null, error: controller.signal.aborted ? 'The request timed out. Please retry.' : error instanceof Error ? error.message : 'Could not load data.', loading: false })
      } finally { window.clearTimeout(timeout) }
    }, body ? 250 : 0)
    return () => { disposed = true; window.clearTimeout(debounce); window.clearTimeout(timeout); controller.abort() }
  }, [url, body, token, key, enabled])
  const current = result.key === key && enabled
  return { data: current ? result.data : null, error: current ? result.error : null, loading: enabled && (!current || result.loading), refresh: () => setRevision(value => value + 1) }
}
