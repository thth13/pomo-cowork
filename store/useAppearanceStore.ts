'use client'

import { create } from 'zustand'
import { BACKGROUNDS, DEFAULT_APPEARANCE, isPremiumBackground, isPremiumTimerFont, parseAppearance, type BackgroundId, type TimerFont } from '@/lib/appearance'
import { hasActiveProAccess } from '@/lib/proAccess'
import { useAuthStore } from '@/store/useAuthStore'

export const APPEARANCE_STORAGE_KEY = 'pomo:appearance:v1'
type MediaStatus = 'idle' | 'loading' | 'ready' | 'error' | 'blocked'

interface AppearanceStore {
  backgroundId: BackgroundId
  timerFont: TimerFont
  videoPaused: boolean
  hydrated: boolean
  hasProAccess: boolean
  storageAvailable: boolean
  mediaStatus: MediaStatus
  mediaRevision: number
  pendingBackgroundId: BackgroundId | null
  failedBackgroundId: BackgroundId | null
  hydrate: () => void
  restore: (value: string | null) => void
  syncProAccess: () => void
  setBackground: (id: BackgroundId) => void
  setTimerFont: (font: TimerFont) => void
  setVideoPaused: (paused: boolean) => void
  setMediaStatus: (id: BackgroundId, status: MediaStatus) => void
  retryMedia: () => void
  reset: () => void
}

export const useAppearanceStore = create<AppearanceStore>((set, get) => {
  // Preserve preferences while access is unavailable (including the initial auth check).
  let savedAppearance = { ...DEFAULT_APPEARANCE }
  const canUsePremium = () => {
    const { isAuthenticated, user } = useAuthStore.getState()
    return isAuthenticated && hasActiveProAccess(user)
  }
  const availableAppearance = () => {
    const hasProAccess = canUsePremium()
    return {
      ...savedAppearance,
      hasProAccess,
      backgroundId: !hasProAccess && isPremiumBackground(savedAppearance.backgroundId) ? DEFAULT_APPEARANCE.backgroundId : savedAppearance.backgroundId,
      timerFont: !hasProAccess && isPremiumTimerFont(savedAppearance.timerFont) ? DEFAULT_APPEARANCE.timerFont : savedAppearance.timerFont,
    }
  }
  let cancelImageLoad: (() => void) | undefined
  const cancelPendingBackground = () => {
    cancelImageLoad?.()
    cancelImageLoad = undefined
    set({ pendingBackgroundId: null, failedBackgroundId: null })
  }
  const save = (changes: Partial<typeof DEFAULT_APPEARANCE>) => {
    savedAppearance = { ...savedAppearance, ...changes }
    set(availableAppearance())
    try {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(savedAppearance))
      set({ storageAvailable: true })
    } catch {
      set({ storageAvailable: false })
    }
  }

  return {
    ...DEFAULT_APPEARANCE,
    hydrated: false,
    hasProAccess: false,
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
        savedAppearance = parseAppearance(value ? JSON.parse(value) : null)
        const next = availableAppearance()
        set({ ...next, mediaStatus: next.backgroundId === get().backgroundId ? get().mediaStatus : 'idle' })
      } catch {
        // Invalid saved data must never prevent opening the timer.
        savedAppearance = { ...DEFAULT_APPEARANCE }
        set({ ...availableAppearance(), mediaStatus: 'idle' })
      }
    },
    syncProAccess: () => {
      const next = availableAppearance()
      const pending = get().pendingBackgroundId
      const failed = get().failedBackgroundId
      if (!next.hasProAccess) {
        if (pending && isPremiumBackground(pending)) cancelPendingBackground()
        else if (failed && isPremiumBackground(failed)) set({ failedBackgroundId: null })
      }
      set({ ...next, mediaStatus: next.backgroundId === get().backgroundId ? get().mediaStatus : 'idle' })
    },
    setBackground: backgroundId => {
      if (isPremiumBackground(backgroundId) && !canUsePremium()) return
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
      image.crossOrigin = 'anonymous'
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
        if (isPremiumBackground(backgroundId) && !canUsePremium()) {
          set({ pendingBackgroundId: null })
          get().syncProAccess()
          return
        }
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
    setTimerFont: timerFont => {
      if (isPremiumTimerFont(timerFont) && !canUsePremium()) return
      save({ timerFont })
    },
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
