import { getOrCreateAnonymousId } from '@/lib/anonymousUser'
import type { NotesSnapshot, WorkspaceNote } from '@/lib/notes'

export class NotesRequestError extends Error {
  constructor(public status: number) { super(`Notes request failed: ${status}`) }
}

let sessionGuestId: string | undefined

export function createNotesClient(token: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  else {
    try { headers['X-Anonymous-Id'] = getOrCreateAnonymousId() }
    catch {
      // The note body never depends on browser storage. A guest whose browser
      // blocks identity storage can still use the database for this session.
      sessionGuestId ??= `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`
      headers['X-Anonymous-Id'] = sessionGuestId
    }
  }

  async function request<T>(method: string, body?: object, signal?: AbortSignal): Promise<T> {
    const controller = new AbortController()
    const abort = () => controller.abort()
    if (signal?.aborted) controller.abort()
    signal?.addEventListener('abort', abort, { once: true })
    const timeout = window.setTimeout(abort, 20000)
    try {
      const response = await fetch('/api/notes', {
        method, headers, cache: 'no-store', signal: controller.signal,
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      if (!response.ok) throw new NotesRequestError(response.status)
      return await response.json() as T
    } finally {
      window.clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
    }
  }
  return {
    load: (signal?: AbortSignal) => request<NotesSnapshot>('GET', undefined, signal),
    save: (notes: WorkspaceNote[], revision: number, legacyImported: boolean) =>
      request<{ revision: number }>('PUT', { notes, revision, legacyImported }),
  }
}
