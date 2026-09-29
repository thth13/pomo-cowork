'use client'

import { create } from 'zustand'
import { DEFAULT_APPEARANCE, parseAppearance, type BackgroundId, type TimerFont } from '@/lib/appearance'

export const APPEARANCE_STORAGE_KEY = 'pomo:appearance:v1'
type MediaStatus = 'idle' | 'loading' | 'ready' | 'error' | 'blocked'

interface AppearanceStore {
  backgroundId: BackgroundId
  timerFont: TimerFont
  videoPaused: boolean
  hydrated: boolean
  storageAvailable: boolean
  mediaStatus: MediaStatus
  mediaRevision: number
  hydrate: () => void
  restore: (value: string | null) => void
  setBackground: (id: BackgroundId) => void
  setTimerFont: (font: TimerFont) => void
  setVideoPaused: (paused: boolean) => void
  setMediaStatus: (id: BackgroundId, status: MediaStatus) => void
  retryMedia: () => void
  reset: () => void
}

export const useAppearanceStore = create<AppearanceStore>((set, get) => {
  const save = (changes: Partial<typeof DEFAULT_APPEARANCE>) => {
    set(changes)
    const { backgroundId, timerFont, videoPaused } = get()
    try {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ backgroundId, timerFont, videoPaused }))
      set({ storageAvailable: true })
    } catch {
      set({ storageAvailable: false })
    }
  }

  return {
    ...DEFAULT_APPEARANCE,
    hydrated: false,
    storageAvailable: true,
    mediaStatus: 'idle',
    mediaRevision: 0,
    hydrate: () => {
      if (get().hydrated) return
      try {
        get().restore(localStorage.getItem(APPEARANCE_STORAGE_KEY))
      } catch {
        set({ storageAvailable: false })
      }
      set({ hydrated: true })
    },
    restore: value => {
      try {
        const next = parseAppearance(value ? JSON.parse(value) : null)
        set({ ...next, mediaStatus: next.backgroundId === get().backgroundId ? get().mediaStatus : 'idle' })
      } catch {
        // Invalid saved data must never prevent opening the timer.
        set({ ...DEFAULT_APPEARANCE, mediaStatus: 'idle' })
      }
    },
    setBackground: backgroundId => {
      if (get().backgroundId === backgroundId) return
      set({ mediaStatus: 'idle' })
      save({ backgroundId })
    },
    setTimerFont: timerFont => save({ timerFont }),
    setVideoPaused: videoPaused => save({ videoPaused }),
    setMediaStatus: (id, mediaStatus) => {
      if (get().backgroundId === id) set({ mediaStatus })
    },
    retryMedia: () => set(state => ({ mediaRevision: state.mediaRevision + 1, mediaStatus: 'idle' })),
    reset: () => {
      set({ mediaStatus: 'idle' })
      save(DEFAULT_APPEARANCE)
    },
  }
})
