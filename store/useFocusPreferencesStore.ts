'use client'

import { create } from 'zustand'
import { useAuthStore } from './useAuthStore'
import { defaultFocusPreferences, readFocusPreferences, type FocusPreferences as Preferences } from '@/lib/focusPreferences'

const STORAGE_KEY = 'pomo:focus-preferences:v1'
interface FocusPreferences extends Preferences {
  minimalTimerVisible: boolean
  setMinimalTimerVisible: (visible: boolean) => void
  hydrated: boolean
  storageAvailable: boolean
  accountBacked: boolean
  syncStatus: 'local' | 'saved' | 'loading' | 'saving' | 'error'
  hydrate: () => void
  update: (patch: Partial<Preferences>) => Promise<void>
  refresh: () => Promise<void>
  retry: () => Promise<void>
}

export const useFocusPreferencesStore = create<FocusPreferences>((set, get) => {
  let revision = 0
  let pending: Partial<Preferences> | null = null
  const account = () => {
    const { user, token } = useAuthStore.getState()
    return user && token && !user.isAnonymous ? { id: user.id, token, settings: user.settings } : null
  }
  const cacheKey = () => account() ? `${STORAGE_KEY}:${account()!.id}` : STORAGE_KEY
  const apply = (next: Preferences) => set({ ...next,
    ...(next.minimalTimer !== get().minimalTimer ? { minimalTimerVisible: true } : {}),
  })
  const cache = () => {
    try {
      localStorage.setItem(cacheKey(), JSON.stringify(readFocusPreferences(get())))
      set({ storageAvailable: true })
    } catch { set({ storageAvailable: false }) }
  }
  const restoreOwner = () => {
    revision++
    pending = null
    const owner = account()
    if (owner) {
      apply(readFocusPreferences(owner.settings))
      set({ accountBacked: true, syncStatus: 'saved' })
    } else {
      try { apply(readFocusPreferences(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))) }
      catch { apply(defaultFocusPreferences); set({ storageAvailable: false }) }
      set({ accountBacked: false, syncStatus: 'local' })
    }
  }
  const save = async () => {
    const owner = account()
    if (!owner || !pending || get().syncStatus === 'saving') return
    const patch = pending
    const version = ++revision
    set({ syncStatus: 'saving' })
    try {
      const response = await fetch('/api/settings/workspace', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${owner.token}` },
        body: JSON.stringify(patch), signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) throw new Error('SAVE_FAILED')
      const next = readFocusPreferences(await response.json())
      if (version !== revision || account()?.id !== owner.id || account()?.token !== owner.token) return
      apply(next)
      pending = null
      set({ syncStatus: 'saved' })
      useAuthStore.getState().updateUserSettings(next)
      cache()
    } catch {
      if (version === revision) set({ syncStatus: 'error' })
    }
  }
  return {
    ...defaultFocusPreferences,
    minimalTimerVisible: true,
    setMinimalTimerVisible: minimalTimerVisible => set({ minimalTimerVisible }),
    hydrated: false, storageAvailable: true, accountBacked: false, syncStatus: 'local',
    hydrate: () => {
      if (get().hydrated || typeof window === 'undefined') return
      restoreOwner()
      set({ hydrated: true })
      // Apply account privacy before the socket's auth subscriber publishes a snapshot.
      useAuthStore.subscribe((state, previous) => {
        if (state.user?.id !== previous.user?.id || state.token !== previous.token || state.user?.isAnonymous !== previous.user?.isAnonymous) {
          restoreOwner()
        } else if (state.user?.settings !== previous.user?.settings && account() && !pending && get().syncStatus !== 'loading') {
          apply(readFocusPreferences(state.user?.settings))
        }
      })
      window.addEventListener('storage', event => {
        if (event.key !== cacheKey() && event.key !== null) return
        if (account()) { void get().refresh(); return }
        try { apply(readFocusPreferences(JSON.parse(event.newValue ?? 'null'))) } catch { /* Retain the last valid choice. */ }
      })
      window.addEventListener('focus', () => { void get().refresh() })
    },
    update: async patch => {
      get().hydrate()
      if (get().syncStatus === 'saving' || get().syncStatus === 'loading') return
      apply({ ...readFocusPreferences(get()), ...patch })
      if (!account()) { cache(); return }
      pending = { ...pending, ...patch }
      await save()
    },
    refresh: async () => {
      const owner = account()
      if (!owner || pending || get().syncStatus === 'loading') return
      const version = ++revision
      set({ syncStatus: 'loading' })
      try {
        const response = await fetch('/api/settings/workspace', {
          headers: { Authorization: `Bearer ${owner.token}` }, cache: 'no-store', signal: AbortSignal.timeout(15000),
        })
        if (!response.ok) throw new Error('LOAD_FAILED')
        const next = readFocusPreferences(await response.json())
        if (version !== revision || account()?.id !== owner.id || account()?.token !== owner.token) return
        apply(next)
        set({ syncStatus: 'saved' })
        useAuthStore.getState().updateUserSettings(next)
      } catch { if (version === revision) set({ syncStatus: 'error' }) }
    },
    retry: async () => { if (pending) await save(); else await get().refresh() },
  }
})
