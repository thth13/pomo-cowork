const TIMER_STARTED_KEY = 'pomo:timer-ever-started:v1'

export function recordTimerStarted(): void {
  try { localStorage.setItem(TIMER_STARTED_KEY, 'true') } catch { /* The timer store retains this visit's state. */ }
}

export function hasStartedTimerBefore(userId?: string): boolean {
  try {
    if (localStorage.getItem(TIMER_STARTED_KEY) === 'true') return true
    // Recognize activity recorded before the dedicated first-start marker existed.
    if (localStorage.getItem('pomo:first-focus:v1:guest') === 'done') return true
    if (userId && localStorage.getItem(`pomo:first-focus:v1:${userId}`) === 'done') return true
    const completions: unknown = JSON.parse(localStorage.getItem('pomo:guest-signup-prompt:v1') ?? '[]')
    return Array.isArray(completions) && completions.length > 0
  } catch {
    return false
  }
}
