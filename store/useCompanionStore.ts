import { create } from 'zustand'

export const COMPANION_STORAGE_KEY = 'pomo:walking-companion:v1'

interface CompanionState {
  visible: boolean
  hydrated: boolean
  hydrate: () => void
  setVisible: (visible: boolean) => void
}

export const useCompanionStore = create<CompanionState>((set, get) => ({
  visible: true,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return
    let visible = true
    try {
      const saved = JSON.parse(localStorage.getItem(COMPANION_STORAGE_KEY) || 'null')
      if (typeof saved?.visible === 'boolean') visible = saved.visible
    } catch { /* Optional preferences fall back to memory. */ }
    set({ visible, hydrated: true })
  },
  setVisible: visible => {
    try {
      const saved = JSON.parse(localStorage.getItem(COMPANION_STORAGE_KEY) || 'null')
      const preferences = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
      localStorage.setItem(COMPANION_STORAGE_KEY, JSON.stringify({ ...preferences, visible }))
    } catch { /* Keep the switch usable when browser storage is unavailable. */ }
    set({ visible, hydrated: true })
  },
}))
