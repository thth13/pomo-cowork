const KEY = 'pomo:roomAuthReturn'
const ROOM_PATH = /^\/rooms\/[a-zA-Z0-9_-]+$/
const MAX_AGE_MS = 10 * 60 * 1000

/** Keep the room invitation through Google sign-in without putting it in OAuth state. */
export function rememberRoomAuthReturn() {
  try {
    sessionStorage.removeItem(KEY)
    if (ROOM_PATH.test(window.location.pathname)) {
      const join = new URLSearchParams(window.location.search).get('join') === '1'
      sessionStorage.setItem(KEY, JSON.stringify({
        path: window.location.pathname + (join ? '?join=1' : ''),
        createdAt: Date.now(),
      }))
    }
  } catch { /* Optional navigation state must not prevent signing in. */ }
}

export function consumeRoomAuthReturn(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    if (typeof saved?.path !== 'string' || typeof saved?.createdAt !== 'number') return null
    const age = Date.now() - saved.createdAt
    const destination = new URL(saved.path, window.location.origin)
    if (age < 0 || age >= MAX_AGE_MS || destination.origin !== window.location.origin || !ROOM_PATH.test(destination.pathname)) return null
    return destination.pathname + (destination.searchParams.get('join') === '1' ? '?join=1' : '')
  } catch {
    return null
  }
}
