'use client'
import { useAuthStore } from '@/store/useAuthStore'
export async function achievementApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (options.signal?.aborted) controller.abort()
  options.signal?.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(abort, 30000)
  try {
    const response = await fetch('/api/achievements/' + path, {
      ...options, signal: controller.signal, cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...options.headers },
    })
    if (!response.ok) throw new Error('Unable to load or save achievements.')
    return await response.json() as T
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abort)
  }
}
