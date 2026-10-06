'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { useAuthStore } from '@/store/useAuthStore'
import { getOrCreateAnonymousId } from '@/lib/anonymousUser'
import { habitDate, type Habit } from '@/lib/habits'

export function useHabits(isVisible = true) {
  const { mutate: mutateCache } = useSWRConfig()
  const { token, user, isLoading: authLoading } = useAuthStore()
  const [identity, setIdentity] = useState<{ owner: string; headers: Record<string, string> } | null>(null)
  const [identityError, setIdentityError] = useState(false)
  const [today, setToday] = useState('')
  useEffect(() => {
    if (!isVisible) return
    const refreshDate = () => setToday(habitDate())
    refreshDate()
    const timer = window.setInterval(refreshDate, 30_000)
    window.addEventListener('focus', refreshDate)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refreshDate) }
  }, [isVisible])
  const owner = token ? `user:${user?.id}:${token}` : `guest:${user?.id ?? ''}`
  useEffect(() => {
    if (authLoading) return
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`
      else headers['X-Anonymous-Id'] = getOrCreateAnonymousId()
      setIdentity({ owner, headers })
      setIdentityError(false)
    } catch { setIdentityError(true); setIdentity(null) }
  }, [authLoading, owner, token])
  const ready = !authLoading && identity?.owner === owner
  const key = ready && identity ? ['/api/habits', identity.headers] as const : null
  const wasVisible = useRef(isVisible)
  const { data, error, isLoading, mutate } = useSWR<Habit[]>(key, async ([url, headers]: readonly [string, Record<string, string>]) => {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) })
    if (!response.ok) throw new Error('load')
    return response.json()
  }, { isPaused: () => !isVisible, revalidateOnFocus: isVisible, focusThrottleInterval: 5 * 60_000, refreshInterval: isVisible ? 5 * 60_000 : 0, shouldRetryOnError: false })

  useEffect(() => {
    if (isVisible && !wasVisible.current) void mutate()
    wasVisible.current = isVisible
  }, [isVisible, mutate])

  async function save(body: Record<string, unknown>, id?: string) {
    if (!ready || !identity || !key) throw new Error('identity')
    const response = await fetch(id ? `/api/habits/${encodeURIComponent(id)}` : '/api/habits', {
      method: id ? 'PATCH' : 'POST', headers: identity.headers,
      body: JSON.stringify(body), signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) throw new Error('save')
    const habit: Habit = await response.json()
    // Use the captured request key: a login/logout while saving must never write
    // the previous owner's result into the newly selected account's cache.
    await mutateCache<Habit[]>(key, (current = []) => id ? current.map((item) => item.id === id ? habit : item) : [...current.filter((item) => item.id !== habit.id), habit], { revalidate: false })
  }
  return { habits: ready ? data : undefined, today, loading: !identityError && (!ready || !today || isLoading), error: identityError || error, retry: () => { if (identityError) window.location.reload(); else void mutate() }, save }
}
