'use client'

import { create } from 'zustand'
import { BACKGROUNDS, DEFAULT_APPEARANCE, parseAppearance, type BackgroundId, type TimerFont } from '@/lib/appearance'

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
  pendingBackgroundId: BackgroundId | null
  failedBackgroundId: BackgroundId | null
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
  let cancelImageLoad: (() => void) | undefined
  const cancelPendingBackground = () => {
    cancelImageLoad?.()
    cancelImageLoad = undefined
    set({ pendingBackgroundId: null, failedBackgroundId: null })
  }
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
    pendingBackgroundId: null,
    failedBackgroundId: null,
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
      cancelPendingBackground()
      try {
        const next = parseAppearance(value ? JSON.parse(value) : null)
        set({ ...next, mediaStatus: next.backgroundId === get().backgroundId ? get().mediaStatus : 'idle' })
      } catch {
        // Invalid saved data must never prevent opening the timer.
        set({ ...DEFAULT_APPEARANCE, mediaStatus: 'idle' })
      }
    },
    setBackground: backgroundId => {
      if (get().pendingBackgroundId === backgroundId) return
      cancelPendingBackground()
      if (get().backgroundId === backgroundId) return
      const scene = BACKGROUNDS.find(background => background.id === backgroundId)
      if (!scene) return
      if (scene.kind !== 'image') {
        set({ mediaStatus: 'idle' })
        save({ backgroundId })
        return
      }

      set({ pendingBackgroundId: backgroundId })
      const image = new Image()
      let cancelled = false
      const cleanup = () => {
        cancelled = true
        window.clearTimeout(timeout)
        image.onload = null
        image.onerror = null
      }
      const finish = (success: boolean) => {
        if (cancelled) return
        cleanup()
        cancelImageLoad = undefined
        if (success) {
          set({ pendingBackgroundId: null, mediaStatus: 'ready' })
          save({ backgroundId })
        } else {
          set({ pendingBackgroundId: null, failedBackgroundId: backgroundId })
        }
      }
      const timeout = window.setTimeout(() => finish(false), 20000)
      cancelImageLoad = cleanup
      image.onload = () => {
        // Decode the full-size image before replacing the currently visible scene.
        image.decode().then(() => finish(true), () => finish(false))
      }
      image.onerror = () => finish(false)
      image.src = scene.src
    },
    setTimerFont: timerFont => save({ timerFont }),
    setVideoPaused: videoPaused => save({ videoPaused }),
    setMediaStatus: (id, mediaStatus) => {
      if (get().backgroundId === id) set({ mediaStatus })
    },
    retryMedia: () => {
      const failed = get().failedBackgroundId
      if (failed) get().setBackground(failed)
      else set(state => ({ mediaRevision: state.mediaRevision + 1, mediaStatus: 'idle' }))
    },
    reset: () => {
      cancelPendingBackground()
      set({ mediaStatus: 'idle' })
      save(DEFAULT_APPEARANCE)
    },
  }
})
