'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { getOrCreateAnonymousId } from '@/lib/anonymousUser'

export default function GuestVisitTracker() {
  const isLoading = useAuthStore(state => state.isLoading)
  const token = useAuthStore(state => state.token)
  const landingPage = useRef<string | null>(null)
  const visitorId = useRef<string | null>(null)

  useEffect(() => {
    landingPage.current ??= window.location.pathname
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
          body: JSON.stringify({ anonymousId: visitorId.current, pagePath: landingPage.current }),
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
