'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { es } from 'react-day-picker/locale'
import { useI18n } from '@/components/I18nProvider'
import { calendarCopy } from '@/lib/i18n/calendar'
import { calendarDate, layoutCalendarEvents, readCalendarEvents, validCalendarDate, type CalendarEvent } from '@/lib/calendar'
import 'react-day-picker/dist/style.css'
import '@/app/workspace-calendar.css'

const timeValue = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
const minutesValue = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : NaN
const HOUR_HEIGHT = 64

export default function WorkspaceCalendar({ owner, isVisible }: { owner: string; isVisible: boolean }) {
  const { language } = useI18n()
  const copy = calendarCopy[language]
  const locale = language === 'es' ? 'es-ES' : 'en-US'
  const key = `pomo:calendar:${owner}:v1`
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const [date, setDate] = useState(() => calendarDate(new Date()))
  const [now, setNow] = useState(() => new Date())
  const [picker, setPicker] = useState(false)
  const [draft, setDraft] = useState<CalendarEvent | null>(null)
  const editing = draft !== null
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [error, setError] = useState<'title' | 'date' | 'time' | null>(null)
  const [status, setStatus] = useState('')
  const [removed, setRemoved] = useState<CalendarEvent | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const dateControls = useRef<HTMLDivElement>(null)
  const dateButton = useRef<HTMLButtonElement>(null)
  const titleInput = useRef<HTMLInputElement>(null)
  const selected = new Date(`${date}T12:00:00`)
  const today = calendarDate(now)
  const dayEvents = events.filter(event => event.date === date)
  const formatTime = (minutes: number) => new Date(2000, 0, 1, 0, minutes).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })

  useEffect(() => {
    try { setEvents(readCalendarEvents(key)) } catch { setStorageError(true) }
    setReady(true)
    const sync = (event: StorageEvent) => {
      if (event.key !== key && event.key !== null) return
      try { setEvents(readCalendarEvents(key)); setStorageError(false) } catch { setStorageError(true) }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [key])

  useEffect(() => {
    if (!isVisible) return
    setNow(new Date())
    const timer = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [isVisible])

  useEffect(() => {
    if (isVisible && !draft && scroller.current) {
      const hour = date === calendarDate(new Date()) ? new Date().getHours() : 8
      scroller.current.scrollTop = Math.max(0, hour - 1) * HOUR_HEIGHT
    }
  }, [date, isVisible, draft])

  useEffect(() => { if (editing && isVisible) titleInput.current?.focus() }, [editing, isVisible])

  useEffect(() => {
    if (!picker) return
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !dateControls.current?.contains(event.target)) setPicker(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [picker])

  const commit = (update: (current: CalendarEvent[]) => CalendarEvent[]) => {
    try {
      const next = update(readCalendarEvents(key))
      localStorage.setItem(key, JSON.stringify(next))
      setEvents(next)
      setStorageError(false)
      return true
    } catch { setStorageError(true); return false }
  }
  const closeEditor = () => { setDraft(null); setError(null); requestAnimationFrame(() => addButton.current?.focus()) }
  const openEditor = (event?: CalendarEvent, hour = Math.min(22, new Date().getHours()), allDay = false) => {
    const next = event ?? { id: crypto.randomUUID(), title: '', date, start: hour * 60, end: (hour + 1) * 60, allDay, completed: false }
    setDraft(next); setStart(timeValue(next.start)); setEnd(timeValue(Math.min(next.end, 1439))); setError(null); setPicker(false)
  }
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft) return
    const invalid = !draft.title.trim() ? 'title' : !validCalendarDate(draft.date) ? 'date' : !draft.allDay && !(minutesValue(end) > minutesValue(start)) ? 'time' : null
    setError(invalid)
    if (invalid) { event.currentTarget.querySelector<HTMLInputElement>(`[name="${invalid === 'time' ? 'end' : invalid}"]`)?.focus(); return }
    const next = { ...draft, title: draft.title.trim(), start: draft.allDay ? 0 : minutesValue(start), end: draft.allDay ? 1440 : minutesValue(end) }
    if (commit(current => [...current.filter(item => item.id !== next.id), next])) {
      setDate(next.date); setStatus(copy.saved); closeEditor()
    }
  }
  const shiftDate = (amount: number) => { const next = new Date(selected); next.setDate(next.getDate() + amount); setDate(calendarDate(next)); setPicker(false) }
  const renderEvent = (event: CalendarEvent) => <div className="calendar-event-content">
    <button type="button" className="calendar-check" aria-label={`${event.completed ? copy.incomplete : copy.complete}: ${event.title}`} aria-pressed={event.completed} onClick={() => commit(current => current.map(item => item.id === event.id ? { ...item, completed: !item.completed } : item))}>{event.completed && <Check size={12} aria-hidden="true" />}</button>
    <button type="button" className="calendar-event-edit" onClick={() => openEditor(event)} title={`${event.title} · ${event.allDay ? copy.allDay : `${formatTime(event.start)} – ${formatTime(event.end)}`}`} aria-label={`${copy.edit}: ${event.title}`}><strong>{event.title}</strong>{!event.allDay && <small>{formatTime(event.start)} – {formatTime(event.end)}</small>}</button>
  </div>

  return <div className="workspace-calendar" data-no-translate>
    <div className={storageError || removed ? "calendar-feedback" : "sr-only"} role="status">{storageError ? copy.storageError : status}{removed && <button type="button" onClick={() => { if (commit(current => [...current.filter(item => item.id !== removed.id), removed])) { setRemoved(null); setStatus(copy.restored) } }}>{copy.undo}</button>}</div>
    {draft ? <form className="calendar-editor" noValidate onSubmit={save} onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation() }}>
      <h3>{events.some(event => event.id === draft.id) ? copy.edit : copy.newEvent}</h3>
      <label htmlFor="calendar-title">{copy.name}</label>
      <input ref={titleInput} id="calendar-title" name="title" maxLength={160} value={draft.title} placeholder={copy.placeholder} aria-invalid={error === 'title'} aria-describedby={error === 'title' ? 'calendar-error' : undefined} onChange={event => setDraft({ ...draft, title: event.target.value })} />
      <label htmlFor="calendar-date">{copy.date}</label>
      <input id="calendar-date" name="date" type="date" value={draft.date} aria-invalid={error === 'date'} aria-describedby={error === 'date' ? 'calendar-error' : undefined} onChange={event => setDraft({ ...draft, date: event.target.value })} />
      <label className="calendar-all-day-toggle"><input type="checkbox" checked={draft.allDay} onChange={event => setDraft({ ...draft, allDay: event.target.checked })} />{copy.allDay}</label>
      {!draft.allDay && <div className="calendar-time-fields"><label>{copy.start}<input name="start" type="time" value={start} onChange={event => setStart(event.target.value)} /></label><label>{copy.end}<input name="end" type="time" value={end} aria-invalid={error === 'time'} aria-describedby={error === 'time' ? 'calendar-error' : undefined} onChange={event => setEnd(event.target.value)} /></label></div>}
      {error && <p id="calendar-error" className="calendar-error" role="alert">{error === 'title' ? copy.invalidTitle : error === 'date' ? copy.invalidDate : copy.invalidTime}</p>}
      <div className="calendar-editor-actions"><button type="button" onClick={closeEditor}>{copy.cancel}</button><button type="submit" className="calendar-primary">{copy.save}</button></div>
      {events.some(event => event.id === draft.id) && <button type="button" className="calendar-delete" onClick={() => { if (commit(current => current.filter(event => event.id !== draft.id))) { setRemoved(events.find(event => event.id === draft.id) ?? draft); setStatus(copy.deleted); closeEditor() } }}><Trash2 size={14} aria-hidden="true" />{copy.remove}</button>}
    </form> : <>
      <div className="calendar-date-controls" ref={dateControls}>
        <div className="calendar-toolbar">
          <button ref={dateButton} type="button" className="calendar-date-heading" aria-expanded={picker} aria-controls="workspace-calendar-picker" aria-label={`${copy.pickDate}: ${selected.toLocaleDateString(locale, { dateStyle: 'full' })}`} title={selected.toLocaleDateString(locale, { dateStyle: 'full' })} onClick={() => setPicker(value => !value)}>
            <span>{selected.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}<small>{selected.toLocaleDateString(locale, { weekday: 'short' })}</small></span>
            <ChevronDown size={12} aria-hidden="true" />
          </button>
          <button type="button" className="calendar-today" onClick={() => { setDate(calendarDate(new Date())); setPicker(false) }}>{copy.today}</button>
          <div className="calendar-date-arrows">
            <button type="button" title={copy.previous} aria-label={copy.previous} onClick={() => shiftDate(-1)}><ChevronLeft size={15} aria-hidden="true" /></button>
            <button type="button" title={copy.next} aria-label={copy.next} onClick={() => shiftDate(1)}><ChevronRight size={15} aria-hidden="true" /></button>
          </div>
          <button ref={addButton} type="button" className="calendar-add" title={copy.add} aria-label={copy.add} disabled={!ready} onClick={() => openEditor()}><Plus size={16} aria-hidden="true" /></button>
        </div>
        {picker && <div id="workspace-calendar-picker" className="calendar-picker" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setPicker(false); dateButton.current?.focus() } }}><DayPicker mode="single" autoFocus locale={language === 'es' ? es : undefined} weekStartsOn={1} selected={selected} defaultMonth={selected} onSelect={day => { if (day) { setDate(calendarDate(day)); setPicker(false); dateButton.current?.focus() } }} /></div>}
      </div>
      <div className="calendar-all-day"><button type="button" disabled={!ready} onClick={() => openEditor(undefined, 9, true)}>{copy.allDay}<Plus size={12} aria-hidden="true" /></button><div>{dayEvents.filter(event => event.allDay).map(event => <div className="calendar-event" data-completed={event.completed} key={event.id}>{renderEvent(event)}</div>)}</div></div>
      <div className="calendar-timeline-scroll" ref={scroller} aria-label={copy.schedule} tabIndex={0}><div className="calendar-timeline">
        {Array.from({ length: 24 }, (_, hour) => <div className="calendar-hour" key={hour}><span>{formatTime(hour * 60)}</span><button type="button" disabled={!ready} aria-label={`${copy.add}: ${formatTime(hour * 60)}`} onClick={() => openEditor(undefined, hour)}><Plus size={14} aria-hidden="true" /></button></div>)}
        <div className="calendar-events">{layoutCalendarEvents(dayEvents).map(({ event, column, columns }) => <div key={event.id} className="calendar-event calendar-timed-event" data-completed={event.completed} style={{ top: event.start / 60 * HOUR_HEIGHT, height: Math.max(22, (event.end - event.start) / 60 * HOUR_HEIGHT - 2), left: `${column / columns * 100}%`, width: `calc(${100 / columns}% - 3px)` }}>{renderEvent(event)}</div>)}</div>
        {date === today && <div className="calendar-now" style={{ top: (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT }} aria-hidden="true"><i /></div>}
      </div></div>
      <p className="sr-only">{copy.local}{ready && dayEvents.length === 0 ? `. ${copy.empty} ${copy.hint}` : ''}</p>
    </>}
  </div>
}
