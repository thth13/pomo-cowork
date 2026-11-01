import { create } from 'zustand'
import { COMPANION_STORAGE_KEY, companionDefaults, companionPatch, type CompanionPreferences } from '@/lib/companionPreferences'
export { COMPANION_STORAGE_KEY } from '@/lib/companionPreferences'

interface CompanionState extends CompanionPreferences {
  hydrated: boolean
  scope: string | null
  syncStatus: 'local' | 'loading' | 'saving' | 'saved' | 'error'
  hydrate: (scope?: string | null) => void
  setPreferences: (patch: Partial<CompanionPreferences>) => void
  setVisible: (visible: boolean) => void
}

export const useCompanionStore = create<CompanionState>((set, get) => ({
  ...companionDefaults, hydrated: false, scope: null, syncStatus: 'local',
  hydrate: (scope = get().scope) => {
    if (get().hydrated && get().scope === scope) return
    let preferences = { ...companionDefaults }
    try {
      const cached = localStorage.getItem(scope ? `${COMPANION_STORAGE_KEY}:${scope}` : COMPANION_STORAGE_KEY)
      // Initial account migration may seed the existing browser-only settings.
      const raw = cached ?? (scope ? localStorage.getItem(COMPANION_STORAGE_KEY) : null)
      preferences = { ...preferences, ...companionPatch(JSON.parse(raw || 'null')) }
    } catch { /* Optional browser cache; server remains canonical for accounts. */ }
    set({ ...preferences, scope, hydrated: true, syncStatus: scope ? 'loading' : 'local' })
  },
  setPreferences: patch => {
    const next = { ...get(), ...companionPatch(patch) }
    try {
      localStorage.setItem(next.scope ? `${COMPANION_STORAGE_KEY}:${next.scope}` : COMPANION_STORAGE_KEY,
        JSON.stringify({ visible: next.visible, wandering: next.wandering, animations: next.animations, x: next.x, y: next.y }))
    } catch { /* Keep controls usable when browser storage is unavailable. */ }
    set(companionPatch(next))
  },
  setVisible: visible => get().setPreferences({ visible }),
}))
