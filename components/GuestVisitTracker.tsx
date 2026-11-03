'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { getOrCreateAnonymousId } from '@/lib/anonymousUser'

type VisitorNavigator = Navigator & {
  deviceMemory?: number
  globalPrivacyControl?: boolean
  connection?: { effectiveType?: string; saveData?: boolean }
}

function collectDetails() {
  const nav = navigator as VisitorNavigator
  let timezone: string | null = null
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone } catch { /* Optional capability. */ }
  return {
    referrer: document.referrer,
    language: nav.language, languages: Array.from(nav.languages ?? []), timezone,
    screenWidth: window.screen.width, screenHeight: window.screen.height,
    viewportWidth: window.innerWidth, viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio, colorDepth: window.screen.colorDepth,
    touchPoints: nav.maxTouchPoints, cpuCores: nav.hardwareConcurrency,
    deviceMemoryGb: nav.deviceMemory, connectionType: nav.connection?.effectiveType,
    saveData: nav.connection?.saveData, cookieEnabled: nav.cookieEnabled,
    doNotTrack: nav.doNotTrack, globalPrivacyControl: nav.globalPrivacyControl,
    colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  }
}

export default function GuestVisitTracker() {
  const isLoading = useAuthStore(state => state.isLoading)
  const token = useAuthStore(state => state.token)
  const landingPage = useRef<string | null>(null)
  const visitorId = useRef<string | null>(null)
  const details = useRef<ReturnType<typeof collectDetails> | null>(null)

  useEffect(() => {
    landingPage.current ??= window.location.pathname
    // Preserve the entry snapshot while auth resolves and across network retries.
    details.current ??= collectDetails()
    if (isLoading) return
    let disposed = false
    const timers: number[] = []
    const track = async (attempt = 0) => {
      try {
        const authToken = token ?? localStorage.getItem('token')
        if (!authToken) visitorId.current = getOrCreateAnonymousId()
        const response = await fetch('/api/visits', {
          method: 'POST', credentials: 'same-origin', keepalive: true,
          headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
          body: JSON.stringify({ anonymousId: visitorId.current, pagePath: landingPage.current, details: authToken ? undefined : details.current }),
        })
        if (!response.ok && response.status >= 500) throw new Error('Visit tracking unavailable')
      } catch {
        if (!disposed && attempt < 2) timers.push(window.setTimeout(() => { void track(attempt + 1) }, 2000 * (attempt + 1)))
      }
    }
    void track()
    return () => { disposed = true; timers.forEach(window.clearTimeout) }
  }, [isLoading, token])

  return null
}
