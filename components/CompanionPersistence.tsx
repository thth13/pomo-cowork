'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useCompanionStore } from '@/store/useCompanionStore'
import { COMPANION_STORAGE_KEY, companionKeys, companionPatch, type CompanionPreferences } from '@/lib/companionPreferences'

/** One synchronization owner, independent of desktop renderer availability. */
export default function CompanionPersistence() {
  const token = useAuthStore(state => state.token)
  const owner = useAuthStore(state => state.user && !state.user.isAnonymous ? state.user.id : null)
  const loading = useAuthStore(state => state.isLoading)
  useEffect(() => {
    if (loading) return
    useCompanionStore.getState().hydrate(owner)
    if (!owner || !token) return
    const controller = new AbortController()
    const pendingKey = `${COMPANION_STORAGE_KEY}:${owner}:pending`
    let pending: Partial<CompanionPreferences> = {}
    let inFlight: Partial<CompanionPreferences> = {}
    try { pending = companionPatch(JSON.parse(localStorage.getItem(pendingKey) || 'null')) } catch { /* No pending cache. */ }
    const persistPending = () => {
      try {
        const patch = { ...inFlight, ...pending }
        if (Object.keys(patch).length) localStorage.setItem(pendingKey, JSON.stringify(patch))
        else localStorage.removeItem(pendingKey)
      } catch { /* In-memory retry remains available. */ }
    }
    let loadingPreferences = false
    let ready = false
    let applying = false
    let writing = false
    const active = () => !controller.signal.aborted && useCompanionStore.getState().scope === owner
    const request = async (method: 'GET' | 'PATCH', patch?: Partial<CompanionPreferences>) => {
      const timeout = new AbortController()
      const abort = () => timeout.abort()
      controller.signal.addEventListener('abort', abort, { once: true })
      const timer = setTimeout(abort, 10_000)
      try {
        const response = await fetch('/api/beep/preferences', { method, headers: { Authorization: `Bearer ${token}`, ...(patch ? { 'Content-Type': 'application/json' } : {}) },
          body: patch ? JSON.stringify(patch) : undefined, signal: timeout.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('Preferences unavailable')
        return await response.json() as { preferences: CompanionPreferences | null }
      } finally { clearTimeout(timer); controller.signal.removeEventListener('abort', abort) }
    }
    const flush = async () => {
      if (!active() || !ready || writing || !Object.keys(pending).length) return
      writing = true
      while (active() && Object.keys(pending).length) {
        const patch = pending
        pending = {}
        inFlight = patch
        persistPending()
        useCompanionStore.setState({ syncStatus: 'saving' })
        try {
          await request('PATCH', patch)
          inFlight = {}
          persistPending()
          if (active()) useCompanionStore.setState({ syncStatus: 'saved' })
        } catch {
          pending = { ...patch, ...pending }
          inFlight = {}
          persistPending()
          if (active()) useCompanionStore.setState({ syncStatus: 'error' })
          break
        }
      }
      writing = false
    }
    const unsubscribe = useCompanionStore.subscribe((state, previous) => {
      if (applying || !active()) return
      for (const key of companionKeys) if (state[key] !== previous[key]) Object.assign(pending, { [key]: state[key] })
      persistPending()
      void flush()
    })
    const load = async () => {
      if (!active() || loadingPreferences) return
      loadingPreferences = true
      try {
        const result = await request('GET')
        if (!active()) return
        if (result.preferences) {
          applying = true
          useCompanionStore.getState().setPreferences({ ...companionPatch(result.preferences), ...pending })
          applying = false
        } else pending = { ...companionPatch(useCompanionStore.getState()), ...pending }
        ready = true
        useCompanionStore.setState({ syncStatus: 'saved' })
        void flush()
      } catch { if (active()) useCompanionStore.setState({ syncStatus: 'error' }) }
      finally { loadingPreferences = false }
    }
    const retry = () => { if (ready) void flush(); else void load() }
    void load()
    window.addEventListener('online', retry)
    window.addEventListener('focus', retry)
    return () => { controller.abort(); unsubscribe(); window.removeEventListener('online', retry); window.removeEventListener('focus', retry) }
  }, [owner, token, loading])
  return null
}
