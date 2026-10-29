'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { getAnonymousId } from '@/lib/anonymousUser'
import { useAuthStore } from '@/store/useAuthStore'

export interface TodayStatsResponse {
  community: {
    pomodoros: number
    focusMinutes: number
    activeUsers: number
  }
  currentUser: {
    rank: number | null
    pomodoros: number
    focusMinutes: number
  } | null
}

interface DayRange {
  start: string
  end: string
}

const TODAY_STATS_REFRESH_MS = 5 * 60 * 1000
const pendingRefreshes = new Map<string, Promise<TodayStatsResponse | undefined>>()

function currentDay(): DayRange {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

function existingAnonymousId() {
  try { return getAnonymousId() } catch { return null }
}

export function useTodayStats(isVisible = true) {
  const token = useAuthStore(state => state.token)
  const userId = useAuthStore(state => state.user?.id)
  const authLoading = useAuthStore(state => state.isLoading)
  const [range, setRange] = useState<DayRange | null>(null)
  const [anonymousId, setAnonymousId] = useState<string | null>(null)
  const dirty = useRef(false)

  const key = isVisible && !authLoading && range
    ? ['/api/stats/today', token, userId ?? anonymousId ?? 'guest', range.start, range.end] as const
    : null
  const { data, error, isLoading, isValidating, mutate } = useSWR<TodayStatsResponse, Error>(
    key,
    async ([url, authToken, , dayStart, dayEnd]: readonly [string, string | null, string, string, string]) => {
      const params = new URLSearchParams({ dayStart, dayEnd })
      const guestId = !authToken ? existingAnonymousId() : null
      if (guestId) params.set('anonymousId', guestId)
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 20_000)
      try {
        const response = await fetch(`${url}?${params}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
          signal: controller.signal,
          cache: 'no-store',
        })
        if (!response.ok) throw new Error('Unable to load today’s progress')
        return await response.json() as TodayStatsResponse
      } finally {
        window.clearTimeout(timeout)
      }
    },
    {
      refreshInterval: TODAY_STATS_REFRESH_MS,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: isVisible,
      revalidateOnReconnect: isVisible,
      keepPreviousData: false,
      shouldRetryOnError: false,
    }
  )

  const cacheId = key ? JSON.stringify(key) : null
  const refresh = useCallback((): Promise<TodayStatsResponse | undefined> => {
    const nextRange = currentDay()
    const nextAnonymousId = !token ? existingAnonymousId() : null
    if (range?.start !== nextRange.start || range?.end !== nextRange.end || anonymousId !== nextAnonymousId) {
      setRange(nextRange)
      setAnonymousId(nextAnonymousId)
      return Promise.resolve(undefined)
    }
    if (!cacheId) return Promise.resolve(undefined)
    const pending = pendingRefreshes.get(cacheId)
    if (pending) return pending
    const request = mutate().finally(() => {
      if (pendingRefreshes.get(cacheId) === request) pendingRefreshes.delete(cacheId)
    })
    pendingRefreshes.set(cacheId, request)
    return request
  }, [anonymousId, cacheId, mutate, range, token])

  useEffect(() => {
    setRange(currentDay())
    setAnonymousId(!token ? existingAnonymousId() : null)
  }, [isVisible, token, userId])

  useEffect(() => {
    if (!isVisible) return
    const refreshSafely = () => { void refresh().catch(() => undefined) }
    const onSessionCompleted = () => {
      dirty.current = true
      if (!document.hidden) {
        dirty.current = false
        refreshSafely()
      }
    }
    const onVisible = () => {
      if (document.hidden) return
      const day = currentDay()
      if (dirty.current || range?.start !== day.start || range?.end !== day.end || anonymousId !== (!token ? existingAnonymousId() : null)) {
        dirty.current = false
        refreshSafely()
      }
    }
    const onStorage = (event: StorageEvent) => {
      if (!token && (event.key === 'anonymous_user_id' || event.key === null)) onSessionCompleted()
    }
    window.addEventListener('session-completed', onSessionCompleted)
    window.addEventListener('focus', onVisible)
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisible)
    const midnight = window.setTimeout(() => {
      dirty.current = true
      onVisible()
    }, Math.max(0, new Date(currentDay().end).getTime() - Date.now()) + 50)
    return () => {
      window.removeEventListener('session-completed', onSessionCompleted)
      window.removeEventListener('focus', onVisible)
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearTimeout(midnight)
    }
  }, [anonymousId, isVisible, range, refresh, token])

  return {
    data: key ? data : undefined,
    error: key ? error : undefined,
    isLoading: isVisible && (authLoading || !range || isLoading),
    isValidating: Boolean(key && isValidating),
    refresh,
  }
}
