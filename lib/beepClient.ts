import type { BeepConversationDetail } from '@/lib/beepChat'
export class BeepRequestError extends Error {
  constructor(public status: number) { super('Beep request failed') }
}
export async function beepFetch<T>(url: string, token: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) abort()
  const timeout = setTimeout(abort, 15_000)
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' })
    if (!response.ok) throw new BeepRequestError(response.status)
    return await response.json() as T
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort) }
}
export const beepDetail = (id: string, token: string, signal?: AbortSignal) => beepFetch<BeepConversationDetail>(`/api/beep/conversations/${id}`, token, signal)
