export function usernameFromHandle(handle: string): string | null {
  // Next can pass the URL-encoded segment (%40username) to server pages.
  // Leave already-decoded handles intact, including legacy usernames with %.
  if (!handle.startsWith('@')) {
    try {
      handle = decodeURIComponent(handle)
    } catch {
      return null
    }
  }
  return handle.startsWith('@') && handle.length > 1 ? handle.slice(1) : null
}
