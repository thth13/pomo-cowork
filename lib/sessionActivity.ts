import { format } from 'date-fns'
import { getEffectiveMinutes, getSessionAttributionDate, type SessionForStats } from '@/lib/sessionStats'

interface ActivityTotals {
  pomodoros: number
  minutes: number
}

// Index once so a yearly heatmap doesn't scan the entire history for every day.
// Use the same local calendar and attribution rules as the statistics endpoints.
export function buildSessionActivity(sessions: ReadonlyArray<SessionForStats & { type: string }>) {
  const byDay = new Map<string, ActivityTotals>()
  const byMonth = new Map<string, ActivityTotals>()
  let totalPomodoros = 0
  let totalMinutes = 0

  for (const session of sessions) {
    const date = getSessionAttributionDate(session)
    const day = format(date, 'yyyy-MM-dd')
    const month = format(date, 'yyyy-MM')
    const minutes = getEffectiveMinutes(session)
    const pomodoros = session.type === 'WORK' ? 1 : 0

    for (const [map, key] of [[byDay, day], [byMonth, month]] as const) {
      const totals = map.get(key) ?? { pomodoros: 0, minutes: 0 }
      totals.pomodoros += pomodoros
      totals.minutes += minutes
      map.set(key, totals)
    }

    totalPomodoros += pomodoros
    totalMinutes += minutes
  }

  return { byDay, byMonth, totalPomodoros, totalMinutes }
}
