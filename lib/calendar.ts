export interface CalendarEvent {
  id: string
  title: string
  date: string
  start: number
  end: number
  allDay: boolean
  completed: boolean
}

export function calendarDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function validCalendarDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && calendarDate(new Date(`${value}T12:00:00`)) === value
}

export function readCalendarEvents(key: string): CalendarEvent[] {
  const raw: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
  if (!Array.isArray(raw)) throw new Error('Invalid calendar data')
  return raw.filter((event): event is CalendarEvent => !!event &&
    typeof event.id === 'string' && typeof event.title === 'string' &&
    typeof event.date === 'string' && validCalendarDate(event.date) &&
    Number.isInteger(event.start) && Number.isInteger(event.end) &&
    event.start >= 0 && event.end <= 1440 && event.end > event.start &&
    typeof event.allDay === 'boolean' && typeof event.completed === 'boolean')
}

// Connected overlap groups share columns, so simultaneous events remain selectable.
export function layoutCalendarEvents(events: CalendarEvent[]) {
  const sorted = events.filter(event => !event.allDay).sort((a, b) => a.start - b.start || b.end - a.end)
  const result: { event: CalendarEvent; column: number; columns: number }[] = []
  let group: typeof result = []
  let ends: number[] = []
  let groupEnd = 0
  const flush = () => {
    group.forEach(item => result.push({ ...item, columns: ends.length }))
    group = []
    ends = []
  }
  sorted.forEach(event => {
    if (group.length && event.start >= groupEnd) flush()
    let column = ends.findIndex(end => end <= event.start)
    if (column < 0) column = ends.length
    ends[column] = event.end
    groupEnd = group.length ? Math.max(groupEnd, event.end) : event.end
    group.push({ event, column, columns: 1 })
  })
  flush()
  return result
}
