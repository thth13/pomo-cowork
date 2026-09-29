'use client'

import useSWR from 'swr'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import type { StatisticsData } from '@/lib/statistics'

export class StatisticsError extends Error {
  constructor(public status: number) { super('Unable to load statistics') }
}

export function useStatistics() {
  const { token, user, isLoading: authLoading } = useAuthStore()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const key = !authLoading && token ? ['/api/statistics', token, timezone, user?.id] as const : null
  const { data, error, isLoading, isValidating, mutate } = useSWR<StatisticsData, StatisticsError>(key, async ([url, auth, zone]: readonly [string, string, string, string | undefined]) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20_000)
    try {
      const response = await fetch(`${url}?timezone=${encodeURIComponent(zone)}`, { headers: { Authorization: `Bearer ${auth}` }, signal: controller.signal, cache: 'no-store' })
      if (!response.ok) throw new StatisticsError(response.status)
      return await response.json()
    } finally { clearTimeout(timeout) }
  }, { keepPreviousData: false, revalidateOnFocus: true, refreshInterval: 60_000, shouldRetryOnError: false })
  useEffect(() => {
    const refresh = () => { void mutate() }
    window.addEventListener('session-completed', refresh)
    return () => window.removeEventListener('session-completed', refresh)
  }, [mutate])
  return { data: key ? data : undefined, error: key ? error : undefined, loading: authLoading || Boolean(key && isLoading), refreshing: isValidating, signedIn: Boolean(token), retry: () => { void mutate() } }
}
