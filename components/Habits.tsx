'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Archive, Check, ChevronLeft, ChevronRight, Flame, Pencil, Plus, RotateCcw } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { useAuthStore } from '@/store/useAuthStore'
import { useHabits } from '@/hooks/useHabits'
import { habitsCopy } from '@/lib/i18n/habits'
import { habitStreak, shiftHabitDate, type Habit } from '@/lib/habits'
import PersonalPageSkeleton from '@/components/PersonalPageSkeleton'

function HabitNameForm({ initial = '', onSave, onCancel }: { initial?: string; onSave: (title: string) => Promise<boolean>; onCancel?: () => void }) {
  const { language } = useI18n()
  const c = habitsCopy[language]
  const [value, setValue] = useState(initial)
  const [invalid, setInvalid] = useState(false)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const locked = useRef(false)
  const id = onCancel ? 'habit-edit-name' : 'habit-new-name'
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (locked.current) return
    if (!value.trim() || value.trim().length > 120) { setInvalid(true); input.current?.focus(); return }
    locked.current = true
    setBusy(true)
    try {
      if (await onSave(value.trim())) { setValue(''); setInvalid(false) }
    } finally { locked.current = false; setBusy(false) }
  }
  return <form className="habit-form" noValidate onSubmit={submit}>
    <label htmlFor={id}>{c.name}</label>
    <div className="habit-form-controls">
      <input ref={input} id={id} value={value} maxLength={120} disabled={busy} placeholder={c.placeholder} aria-invalid={invalid} aria-describedby={invalid ? `${id}-error` : undefined} onChange={(event) => { setValue(event.target.value); setInvalid(false) }} onKeyDown={(event) => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }} />
      <button className="habit-button habit-primary" type="submit" disabled={busy} aria-busy={busy}>{!onCancel && <Plus size={16} aria-hidden="true" />}{onCancel ? c.save : c.add}</button>
      {onCancel && <button className="habit-button" type="button" disabled={busy} onClick={onCancel}>{c.cancel}</button>}
    </div>
    <span id={`${id}-error`} className="habit-field-error" aria-live="polite">{invalid ? c.invalid : ''}</span>
  </form>
}

export default function Habits({ compact = false }: { compact?: boolean }) {
  const { language } = useI18n()
  const c = habitsCopy[language]
  const { habits, today, loading, error, retry, save } = useHabits()
  const user = useAuthStore((state) => state.user)
  const [pending, setPending] = useState<string | null>(null)
  const lock = useRef(false)
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const createAttempt = useRef<{ id: string; title: string; startDate: string } | null>(null)
  useEffect(() => { setEditing(null); setMessage(''); setSaveError(false); setOffset(0); createAttempt.current = null }, [user?.id])
  useEffect(() => { if (!compact) document.title = `${c.title} | Pomo Cowork` }, [c.title, compact])

  async function commit(body: Record<string, unknown>, id?: string, feedback: string = c.saved): Promise<boolean> {
    if (lock.current) return false
    lock.current = true
    setPending(id ?? 'new')
    setSaveError(false)
    try { await save(body, id); setMessage(feedback); return true }
    catch { setSaveError(true); return false }
    finally { lock.current = false; setPending(null) }
  }
  const active = (habits ?? []).filter((habit) => !habit.archived)
  const archived = (habits ?? []).filter((habit) => habit.archived)
  const completed = active.filter((habit) => habit.completions.some((entry) => entry.date === today)).length
  const dateLabel = (date: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'full' }) => new Intl.DateTimeFormat(language, options).format(new Date(`${date}T12:00:00`))
  const monday = today ? shiftHabitDate(today, -((new Date(`${today}T12:00:00`).getDay() + 6) % 7) + offset * 7) : ''
  const days = monday ? Array.from({ length: 7 }, (_, index) => shiftHabitDate(monday, index)) : []
  const earliest = habits?.reduce((date, habit) => habit.startDate < date ? habit.startDate : date, today) ?? today

  function mark(habit: Habit, date: string, history = false) {
    const checked = habit.completions.some((entry) => entry.date === date)
    const unavailable = date > today || date < habit.startDate || habit.archived
    return <button type="button" className={`habit-check ${history ? 'habit-day' : ''}`} aria-pressed={checked} aria-label={`${checked ? c.unmark : c.mark}: ${habit.title}, ${dateLabel(date)}`} title={`${dateLabel(date)}${unavailable ? ` · ${c.unavailable}` : ''}`} disabled={!!pending || unavailable} aria-busy={pending === habit.id} onClick={() => void commit({ date, completed: !checked }, habit.id)}>
      {checked ? <Check size={17} aria-hidden="true" /> : <span aria-hidden="true" />}
    </button>
  }

  return <section className={`habits ${compact ? 'habits-compact' : ''}`} data-no-translate lang={language} aria-label={c.title}>
    {!compact && <header className="habits-heading">
      <div><span className="habits-kicker">{c.active}</span><h1>{c.title}</h1><p>{c.subtitle}</p></div>
      {today && <time dateTime={today}>{dateLabel(today, { weekday: 'long', month: 'long', day: 'numeric' })}</time>}
    </header>}
    <div className="habit-feedback" aria-live="polite" role="status">{saveError ? <span className="habit-error">{c.saveError}</span> : message}</div>
    {loading ? <PersonalPageSkeleton variant="habits" /> : error && !habits ? <div className="habit-state" role="alert"><p>{c.loadError}</p><button className="habit-button" onClick={retry}>{c.retry}</button></div> : <>
      {error && <div className="habit-state" role="alert"><p>{c.loadError}</p><button className="habit-button" onClick={retry}>{c.retry}</button></div>}
      <div className={compact ? undefined : 'habits-overview'}>
        <div className="habits-today">
          <div className="habits-summary"><h2>{c.today}</h2><span><strong>{completed.toLocaleString(language)}</strong> / {active.length.toLocaleString(language)} {c.done}</span></div>
          <progress max={active.length || 1} value={completed} aria-label={c.done} />
          {active.length === 0 ? <p className="habit-empty">{compact ? c.emptyToday : c.empty}</p> : <>
            {completed === active.length && <p className="habit-all-done"><Check size={14} aria-hidden="true" />{c.allDone}</p>}
            <ul className="habit-list">{active.map((habit) => <li key={habit.id}>
              {mark(habit, today)}
              <div className="habit-name"><span>{habit.title}</span><small><Flame size={12} aria-hidden="true" />{habitStreak(habit, today).toLocaleString(language)} {c.streak}</small></div>
              {!compact && <div className="habit-row-actions">
                <button id={`habit-edit-${habit.id}`} className="habit-icon" type="button" title={c.edit} aria-label={`${c.edit}: ${habit.title}`} disabled={!!pending} onClick={() => { setEditing(habit.id); requestAnimationFrame(() => document.getElementById('habit-edit-name')?.focus()) }}><Pencil size={16} aria-hidden="true" /></button>
                <button className="habit-icon" type="button" title={c.archive} aria-label={`${c.archive}: ${habit.title}`} disabled={!!pending} onClick={() => void commit({ archived: true }, habit.id, c.archivedStatus).then((saved) => { if (saved) { setEditing(null); document.getElementById('habit-new-name')?.focus() } })}><Archive size={16} aria-hidden="true" /></button>
              </div>}
            </li>)}</ul>
          </>}
        </div>
        {!compact && <aside className="habit-create-panel">
          {editing && active.some((habit) => habit.id === editing) ? <HabitNameForm key={editing} initial={active.find((habit) => habit.id === editing)!.title} onSave={async (title) => {
            const saved = await commit({ title }, editing)
            if (saved) { document.getElementById(`habit-edit-${editing}`)?.focus(); setEditing(null) }
            return saved
          }} onCancel={() => { document.getElementById(`habit-edit-${editing}`)?.focus(); setEditing(null) }} /> : <HabitNameForm onSave={async (title) => {
            if (!createAttempt.current || createAttempt.current.title !== title) {
              createAttempt.current = { id: crypto.randomUUID(), title, startDate: today }
            }
            const saved = await commit(createAttempt.current, undefined, c.created)
            if (saved) createAttempt.current = null
            return saved
          }} />}
          {(!user || user.isAnonymous) && <p className="habit-guest">{c.guest}</p>}
        </aside>}
      </div>
      {compact ? <Link className="habit-button habit-manage" href="/habits">{c.manage}<ChevronRight size={16} aria-hidden="true" /></Link> : <>
        {habits && habits.length > 0 && <section className="habit-history" aria-label={c.history}>
          <div className="habit-history-heading"><h2>{c.history}</h2><div className="habit-week-nav">
            <button className="habit-icon" type="button" aria-label={c.previous} title={c.previous} disabled={monday <= earliest} onClick={() => setOffset((value) => value - 1)}><ChevronLeft size={18} /></button>
            <span>{dateLabel(days[0], { month: 'short', day: 'numeric' })} – {dateLabel(days[6], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <button className="habit-icon" type="button" aria-label={c.next} title={c.next} disabled={offset === 0} onClick={() => setOffset((value) => Math.min(0, value + 1))}><ChevronRight size={18} /></button>
            <button className="habit-button" type="button" disabled={offset === 0} onClick={() => setOffset(0)}>{c.current}</button>
          </div></div>
          <div className="habit-history-scroll"><table><caption className="sr-only">{c.history}</caption><thead><tr><th scope="col">{c.name}</th>{days.map((date) => <th scope="col" key={date} aria-current={date === today ? 'date' : undefined}><span>{dateLabel(date, { weekday: 'short' })}</span><strong>{new Date(`${date}T12:00:00`).getDate()}</strong></th>)}<th scope="col">{c.total}</th></tr></thead><tbody>
            {habits.map((habit) => <tr key={habit.id}><th scope="row"><span>{habit.title}</span>{habit.archived && <small>{c.archived}</small>}</th>{days.map((date) => <td key={date}>{mark(habit, date, true)}</td>)}<td>{habit.completions.length.toLocaleString(language)}</td></tr>)}
          </tbody></table></div>
        </section>}
        {archived.length > 0 && <details className="habit-archive"><summary>{c.archived} ({archived.length.toLocaleString(language)})</summary><p>{c.archiveHint}</p><ul className="habit-list">{archived.map((habit) => <li key={habit.id}><span className="habit-name">{habit.title}</span><button className="habit-button" type="button" disabled={!!pending} onClick={() => void commit({ archived: false }, habit.id, c.restored)}><RotateCcw size={14} aria-hidden="true" />{c.restore}</button></li>)}</ul></details>}
      </>}
    </>}
  </section>
}
