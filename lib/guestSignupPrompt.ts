const STORAGE_KEY = 'pomo:guest-signup-prompt:v1'
let completedIds: string[] = []

// Keep at most two IDs: the second completion also records that the prompt was shown.
export function recordGuestFocusCompletion(sessionId: string): boolean {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (Array.isArray(stored) && stored.every((id) => typeof id === 'string')) {
      completedIds = Array.from(new Set([...completedIds, ...stored])).slice(0, 2)
    }
  } catch {
    // Storage may be blocked; retain the count for this page's lifetime.
  }

  if (completedIds.length >= 2 || completedIds.includes(sessionId)) return false
  completedIds.push(sessionId)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completedIds))
  } catch {
    // The in-memory count still prevents repeated invitations.
  }

  return completedIds.length === 2
}
