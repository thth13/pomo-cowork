'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CalendarDays, Check, Download, Play, Plus, Printer, X } from 'lucide-react'
import PlannerSessionTimer from './PlannerSessionTimer'
import UnsavedChangesGuard from '@/components/journal/UnsavedChangesGuard'
import {
  buildStudyPlan, calculatePomodoros, createPlannerInput, dateKeyLocal,
  PlannerValidationError, validatePlannerInput, type PlannedSession, type PlannerInput, type PlannerMode,
} from '@/lib/studyPlanner'
import {
  fromPlannerDraft, parsePlannerSnapshot, plannerCsv, plannerStorageKey,
  serializePlannerSnapshot, toPlannerDraft, type PlannerDraft, type PlannerSnapshot,
} from '@/lib/plannerStorage'
import styles from './StudyPlanner.module.css'

const weekdays = [
  { value: 1, label: 'Mon', name: 'Monday' }, { value: 2, label: 'Tue', name: 'Tuesday' },
  { value: 3, label: 'Wed', name: 'Wednesday' }, { value: 4, label: 'Thu', name: 'Thursday' },
  { value: 5, label: 'Fri', name: 'Friday' }, { value: 6, label: 'Sat', name: 'Saturday' },
  { value: 0, label: 'Sun', name: 'Sunday' },
]

function formatDate(date: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
}

function duration(minutes: number) {
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}` : `${minutes}m`
}

function inputForMode(draft: PlannerDraft, mode: PlannerMode): PlannerInput {
  const input = fromPlannerDraft(draft)
  if (mode !== 'calculator') return input
  const calculation = calculatePomodoros(input.availableMinutes, input.workMinutes, input.breakMinutes)
  const today = dateKeyLocal(new Date())
  return {
    ...input, startDate: today, deadline: today, weekdays: [0, 1, 2, 3, 4, 5, 6],
    topics: [{ ...(input.topics[0] ?? { id: 'focus-task', name: 'My focus task' }), sessions: Math.max(1, calculation.sessions) }],
  }
}

export default function StudyPlanner({ mode }: { mode: PlannerMode }) {
  const [snapshot, setSnapshot] = useState<PlannerSnapshot | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [storageStatus, setStorageStatus] = useState('')
  const [conflict, setConflict] = useState(false)
  const [undo, setUndo] = useState<PlannerSnapshot | null>(null)
  const [selection, setSelection] = useState<{ session: PlannedSession; breakMinutes: number } | null>(null)
  const [page, setPage] = useState(0)
  const [retry, setRetry] = useState(0)
  const [leaveAllowed, setLeaveAllowed] = useState(false)
  const lastSaved = useRef<string | null>(null)
  const savingBlocked = useRef(false)
  const composing = useRef(false)
  const form = useRef<HTMLFormElement>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const startButton = useRef<HTMLButtonElement>(null)
  const calculator = mode === 'calculator'
  const storageFailed = storageStatus.includes('could not') || storageStatus.includes('unavailable')
  const guardLeaving = !leaveAllowed && Boolean(selection || conflict || storageFailed)

  useEffect(() => {
    if (!guardLeaving) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [guardLeaving])

  useEffect(() => {
    const fresh: PlannerSnapshot = { draft: toPlannerDraft(createPlannerInput(mode, dateKeyLocal(new Date()))), committed: null, completed: [] }
    try {
      const saved = window.localStorage.getItem(plannerStorageKey(mode))
      lastSaved.current = saved
      const restored = saved ? parsePlannerSnapshot(saved) : null
      setSnapshot(restored ?? fresh)
      setMessage(restored ? 'Your plan and draft were restored from this browser.' : saved ? 'The saved plan could not be read. Start with a template below.' : '')
    } catch {
      setSnapshot(fresh)
      setStorageStatus('Browser storage is unavailable. Keep this tab open and download your plan before leaving.')
    }
  }, [mode])

  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.storageArea === window.localStorage && (event.key === plannerStorageKey(mode) || event.key === null) && event.newValue !== lastSaved.current) {
        savingBlocked.current = true
        setConflict(true)
      }
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [mode])

  useEffect(() => {
    if (!snapshot || conflict || savingBlocked.current || composing.current) return
    try {
      // Check before writing as well as listening for events: another tab may
      // have saved before React had a chance to process its storage event.
      const current = window.localStorage.getItem(plannerStorageKey(mode))
      if (current !== lastSaved.current) {
        savingBlocked.current = true
        setConflict(true)
        return
      }
      const serialized = serializePlannerSnapshot(snapshot)
      window.localStorage.setItem(plannerStorageKey(mode), serialized)
      lastSaved.current = serialized
      setStorageStatus('Saved in this browser. No account sync.')
    } catch {
      setStorageStatus('Your changes could not be saved. Download the plan or retry saving before leaving.')
    }
  }, [snapshot, mode, conflict, retry])

  const plan = useMemo(() => snapshot?.committed ? buildStudyPlan(snapshot.committed) : null, [snapshot?.committed])
  const dirty = useMemo(() => {
    if (!snapshot?.committed) return false
    try { return JSON.stringify(inputForMode(snapshot.draft, mode)) !== JSON.stringify(snapshot.committed) } catch { return true }
  }, [snapshot, mode])

  if (!snapshot) return <section id="study-planner" className={`${styles.planner} ${styles.loading}`} aria-busy="true"><p role="status">Preparing your planner…</p></section>

  const { draft, committed, completed } = snapshot
  const locked = selection !== null
  const allSessions = plan?.days.flatMap(day => day.sessions) ?? []
  const completedSet = new Set(completed)
  const nextSession = allSessions.find(session => !completedSet.has(session.id))
  const focusTotal = plan?.days.reduce((sum, day) => sum + day.focusMinutes, 0) ?? 0
  const pages = Math.ceil((plan?.days.length ?? 0) / 7)

  const changeDraft = (next: PlannerDraft) => {
    if (locked) return
    setSnapshot({ ...snapshot, draft: next })
    setErrors({})
  }
  const changeField = (key: 'startDate' | 'deadline' | 'availableMinutes' | 'workMinutes' | 'breakMinutes', value: string) => changeDraft({ ...draft, [key]: value.slice(0, key === 'startDate' || key === 'deadline' ? 10 : 64) })
  const errorProps = (key: string) => ({ 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? `planner-error-${key}` : undefined })
  const fieldError = (key: string) => errors[key] ? <span className={styles.error} id={`planner-error-${key}`}>{errors[key]}</span> : null

  const build = (event: FormEvent) => {
    event.preventDefault()
    if (locked || composing.current) return
    let input: PlannerInput
    let nextErrors: Record<string, string>
    try {
      input = inputForMode(draft, mode)
      nextErrors = validatePlannerInput(input)
    } catch (error) {
      nextErrors = error instanceof PlannerValidationError ? error.errors : { planner: 'Check your time settings and try again.' }
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      setMessage('Check the highlighted fields, then build your plan again.')
      window.requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setUndo(snapshot)
    setSnapshot({ ...snapshot, committed: input!, completed: [] })
    setErrors({})
    setPage(0)
    setMessage(calculator ? 'Your focus time is calculated.' : 'Your plan is ready. Start with one session.')
    window.requestAnimationFrame(() => resultHeading.current?.focus())
  }

  const applyTemplate = (variant: 'balanced' | 'reading' | 'revision' | 'custom') => {
    if (locked) return
    const input = createPlannerInput(variant === 'revision' ? 'exam' : mode, dateKeyLocal(new Date()))
    if (variant === 'reading') input.topics = [
      { id: 'read', name: 'Read and take notes', sessions: 4 },
      { id: 'outline', name: 'Outline the argument', sessions: 2 },
      { id: 'write', name: 'Write and revise', sessions: 4 },
    ]
    if (variant === 'custom') input.topics = [{ id: 'topic-1', name: '', sessions: 4 }]
    setUndo(snapshot)
    setSnapshot({ draft: toPlannerDraft(input), committed: null, completed: [] })
    setErrors({})
    setPage(0)
    setMessage('Template loaded. Change the topics and estimates to fit your work.')
  }

  const markDone = (id: string, checked: boolean) => setSnapshot(current => current ? {
    ...current, completed: checked ? Array.from(new Set([...current.completed, id])) : current.completed.filter(value => value !== id),
  } : current)

  const prepare = (session: PlannedSession) => {
    if (!committed || locked || dirty) return
    const day = plan?.days.find(value => value.sessions.some(value => value.id === session.id))
    const last = day?.sessions[day.sessions.length - 1]?.id === session.id
    setSelection({ session, breakMinutes: last ? 0 : committed.breakMinutes })
  }

  const download = () => {
    if (!committed) return
    try {
      const blob = new Blob(['\uFEFF', plannerCsv(committed, completed)], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${mode}-study-plan-${committed.startDate}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage('CSV download requested. It includes the full plan and any unscheduled work.')
    } catch { setMessage('The download could not start. Try again or use Print plan.') }
  }

  const resolveConflict = (keep: boolean) => {
    if (locked) return
    try {
      const raw = window.localStorage.getItem(plannerStorageKey(mode))
      if (!keep) {
        const restored = raw ? parsePlannerSnapshot(raw) : null
        if (!restored) { setMessage('The other plan is unavailable. Download your current plan or choose Keep this version.'); return }
        setUndo(snapshot)
        setSnapshot(restored)
        setPage(0)
        setErrors({})
      }
      lastSaved.current = raw
      savingBlocked.current = false
      setConflict(false)
      setMessage(keep ? 'This tab’s version will be saved.' : 'Loaded the plan saved in the other tab.')
    } catch { setMessage('Browser storage is unavailable. Download your current plan before leaving.') }
  }

  return <section id="study-planner" className={styles.planner} aria-label={calculator ? 'Pomodoro calculator' : 'Study plan builder'}>
    <div className={styles.toolbar}>
      <p><CalendarDays size={17} aria-hidden="true" />{calculator ? 'Make the minutes add up' : 'A little structure for your week'}</p>
      <span>{calculator ? 'Focus + breaks' : 'Plan → focus → check off'}</span>
    </div>
    <div className={styles.workspace}>
      <form ref={form} noValidate onSubmit={build} className={styles.form} onCompositionStart={() => { composing.current = true }} onCompositionEnd={() => { composing.current = false; setRetry(value => value + 1) }}>
        <fieldset disabled={locked} className={styles.formFields}>
          <legend className={styles.formTitle}>{calculator ? 'How much time do you have?' : 'Make it your plan'}</legend>
          {!calculator && <div className={styles.templateGroup}>
            <p className={styles.label}>Start with a template</p>
            <div className={styles.templates}>
              <button type="button" onClick={() => applyTemplate(mode === 'exam' ? 'revision' : 'balanced')}>{mode === 'exam' ? 'Exam revision' : 'Study week'}</button>
              <button type="button" onClick={() => applyTemplate('reading')}>Reading & writing</button>
              <button type="button" onClick={() => applyTemplate('custom')}>My own topics</button>
            </div>
          </div>}
          {!calculator && <div className={styles.twoFields}>
            <label>Start date<input type="date" value={draft.startDate} onChange={event => changeField('startDate', event.target.value)} {...errorProps('startDate')} />{fieldError('startDate')}</label>
            <label>{mode === 'exam' ? 'Last revision day' : 'End date'}<input type="date" value={draft.deadline} onChange={event => changeField('deadline', event.target.value)} {...errorProps('deadline')} />{fieldError('deadline')}</label>
          </div>}
          {!calculator && <p className={styles.help}>{mode === 'exam' ? 'Choose the last day you can study, usually the day before your exam.' : 'Both dates are included. Plan up to 90 days at a time.'}</p>}
          {!calculator && <fieldset className={styles.weekdays}>
            <legend>Days you can study</legend>
            <div>{weekdays.map(day => <label key={day.value} title={day.name}><input type="checkbox" aria-label={day.name} checked={draft.weekdays.includes(day.value)} onChange={event => changeDraft({ ...draft, weekdays: event.target.checked ? [...draft.weekdays, day.value].sort() : draft.weekdays.filter(value => value !== day.value) })} {...errorProps('weekdays')} /><span>{day.label}</span></label>)}</div>
            {fieldError('weekdays')}
          </fieldset>}
          <label className={styles.field}>{calculator ? 'Available time (minutes)' : 'Available minutes per study day'}<input type="number" inputMode="numeric" min="15" max="480" step="1" value={draft.availableMinutes} onChange={event => changeField('availableMinutes', event.target.value)} {...errorProps('availableMinutes')} />{fieldError('availableMinutes')}</label>
          <p className={styles.help}>Include breaks in this budget. Use 15–480 minutes.</p>
          <div className={styles.twoFields}>
            <label>Focus minutes<input type="number" inputMode="numeric" min="5" max="90" step="1" value={draft.workMinutes} onChange={event => changeField('workMinutes', event.target.value)} {...errorProps('workMinutes')} />{fieldError('workMinutes')}</label>
            <label>Break minutes<input type="number" inputMode="numeric" min="0" max="30" step="1" value={draft.breakMinutes} onChange={event => changeField('breakMinutes', event.target.value)} {...errorProps('breakMinutes')} />{fieldError('breakMinutes')}</label>
          </div>
          <p className={styles.help}>One break length between sessions. No break after the last session and no automatic long breaks.</p>
          <div className={styles.topicHeading}><p className={styles.label}>{calculator ? 'What will you work on?' : 'Topics & estimated sessions'}</p>{!calculator && <span>{draft.topics.length}/12</span>}</div>
          {!calculator && <p className={styles.help}>One session is {draft.workMinutes || '…'} minutes of focus. These are your estimates; adjust them as you learn.</p>}
          {fieldError('topics')}
          <div className={styles.topics}>{draft.topics.map((topic, index) => <div className={calculator ? styles.singleTopic : styles.topic} key={topic.id}>
            <label><span className={styles.srOnly}>{calculator ? 'Task name' : `Topic ${index + 1}`}</span><input type="text" maxLength={120} placeholder="e.g. Algebra practice" value={topic.name} onChange={event => changeDraft({ ...draft, topics: draft.topics.map(value => value.id === topic.id ? { ...value, name: event.target.value } : value) })} {...errorProps(`topic:${topic.id}:name`)} />{fieldError(`topic:${topic.id}:name`)}</label>
            {!calculator && <><label><span className={styles.srOnly}>Sessions for topic {index + 1}</span><input type="number" inputMode="numeric" min="1" max="100" step="1" value={topic.sessions} onChange={event => changeDraft({ ...draft, topics: draft.topics.map(value => value.id === topic.id ? { ...value, sessions: event.target.value.slice(0, 64) } : value) })} {...errorProps(`topic:${topic.id}:sessions`)} />{fieldError(`topic:${topic.id}:sessions`)}</label>
              <button type="button" className={styles.iconButton} disabled={draft.topics.length === 1} aria-label={`Remove topic ${index + 1}${topic.name ? `: ${topic.name}` : ''}`} onClick={() => { setUndo(snapshot); changeDraft({ ...draft, topics: draft.topics.filter(value => value.id !== topic.id) }); setMessage('Topic removed. Use Undo to restore it.'); window.requestAnimationFrame(() => form.current?.querySelector<HTMLButtonElement>('[data-add-topic]')?.focus()) }}><X size={16} aria-hidden="true" /></button></>}
          </div>)}</div>
          {!calculator && <button type="button" data-add-topic className={styles.addTopic} disabled={draft.topics.length >= 12} onClick={() => {
            changeDraft({ ...draft, topics: [...draft.topics, { id: `topic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: '', sessions: '2' }] })
            window.requestAnimationFrame(() => { const fields = form.current?.querySelectorAll<HTMLInputElement>('input[type="text"]'); fields?.[fields.length - 1]?.focus() })
          }}><Plus size={15} aria-hidden="true" />Add topic</button>}
          <button className={`${styles.primary} ${styles.build}`} type="submit">{calculator ? 'Calculate my sessions' : committed ? 'Update my plan' : 'Build my study plan'}<span aria-hidden="true">→</span></button>
          {!calculator && committed && <p className={styles.help}>Updating rebuilds the schedule and clears its checkmarks. Undo restores your previous plan.</p>}
        </fieldset>
        {locked && <p className={styles.notice}>Close the session timer to edit or rebuild your plan.</p>}
      </form>
      <div className={styles.output}>
        <div className={styles.outputHeading}><div><p className={styles.eyebrow}>{plan ? 'One session at a time' : 'Room for progress'}</p><h2 ref={resultHeading} tabIndex={-1}>{calculator ? 'Your focus plan' : 'Your study plan'}</h2></div>
          {plan && <span className={styles.dateRange}>{formatDate(committed!.startDate)}{committed!.startDate !== committed!.deadline && ` – ${formatDate(committed!.deadline)}`}</span>}</div>
        <div className={styles.feedback}>
          <p role="status">{message}</p>
          {undo && <button type="button" disabled={locked} onClick={() => { setSnapshot(undo); setUndo(null); setErrors({}); setPage(0); setMessage('Previous plan restored.') }}>Undo</button>}
        </div>
        {dirty && <p className={styles.notice}>Your inputs have changed. {calculator ? 'Calculate again' : 'Update your plan'} to apply them; the schedule below is the previous version.</p>}
        {!plan ? <div className={styles.empty}>
          <CalendarDays size={32} strokeWidth={1.25} aria-hidden="true" />
          <h3>{calculator ? 'See what fits before you start.' : 'Turn a list of topics into a first step.'}</h3>
          <p>{calculator ? 'Set your time budget and interval lengths. We’ll count complete focus sessions and the breaks between them.' : 'Choose your study days, add topics and estimate the sessions each needs. Your schedule will appear here.'}</p>
          <div className={styles.emptySteps}><span>Choose time</span><span aria-hidden="true">→</span><span>{calculator ? 'Calculate' : 'Build plan'}</span><span aria-hidden="true">→</span><span>Start focusing</span></div>
        </div> : <>
          <dl className={styles.summary}>
            <div><dt>Focus time</dt><dd>{duration(focusTotal)}</dd></div>
            <div><dt>Sessions planned</dt><dd>{plan.scheduledSessions}{!calculator && <small> / {plan.requestedSessions}</small>}</dd></div>
            <div><dt>{calculator ? 'Time left over' : 'Study days'}</dt><dd>{calculator ? duration(committed!.availableMinutes - (plan.days[0]?.totalMinutes ?? 0)) : plan.availableDays}</dd></div>
          </dl>
          {plan.unscheduledSessions > 0 && <div className={styles.warning} role="status"><strong>{plan.dailyCapacity === 0 ? 'A full focus session does not fit yet.' : `${plan.unscheduledSessions} sessions do not fit before your deadline.`}</strong>
            <p>{plan.dailyCapacity === 0 ? 'Increase your available minutes or shorten the focus interval.' : 'Add study days or available minutes, extend the date range, or reduce your estimates.'}</p>
            {!calculator && <ul>{plan.unallocatedTopics.map(topic => <li key={topic.id}>{topic.name}: {topic.sessions} unplanned</li>)}</ul>}
          </div>}
          {plan.scheduledSessions > 0 && <div className={styles.progressLine}><span>{completed.length} of {plan.scheduledSessions} checked off</span><progress value={completed.length} max={plan.scheduledSessions} aria-label="Completed study sessions" /></div>}
            <div className={styles.actions}>
              {plan.scheduledSessions > 0 && <button ref={startButton} type="button" className={styles.primary} disabled={locked || dirty || !nextSession} onClick={() => nextSession && prepare(nextSession)}><Play size={15} aria-hidden="true" />{nextSession ? 'Prepare next session' : 'All sessions checked off'}</button>}
              <button type="button" disabled={dirty} onClick={download}><Download size={15} aria-hidden="true" />Download CSV</button>
              <button type="button" disabled={dirty} onClick={() => window.print()}><Printer size={15} aria-hidden="true" />Print plan</button>
            </div>
            {selection && <PlannerSessionTimer key={selection.session.id} {...selection} onComplete={id => markDone(id, true)} onClose={() => { setSelection(null); window.requestAnimationFrame(() => startButton.current?.focus()) }} />}
          <div className={styles.days}>
            {plan.days.map((day, dayIndex) => <section className={styles.day} hidden={Math.floor(dayIndex / 7) !== page} key={day.date} aria-labelledby={`planner-day-${day.date}`}>
              <div className={styles.dayDate}><h3 id={`planner-day-${day.date}`}><span>{formatDate(day.date, { weekday: 'short' })}</span><time dateTime={day.date}>{formatDate(day.date)}</time></h3><p>{day.sessions.length ? `${duration(day.totalMinutes)} total` : 'Time to spare'}</p></div>
              <div className={styles.daySessions}>{day.sessions.length ? <ol>{day.sessions.map((session, index) => <li key={session.id}>
                <div className={styles.sessionRow}><label className={styles.checkLabel}><input type="checkbox" checked={completedSet.has(session.id)} disabled={locked || dirty} onChange={event => markDone(session.id, event.target.checked)} /><span className={completedSet.has(session.id) ? styles.done : undefined}>{session.topicName}<span className={styles.srOnly}>, session {index + 1} on {formatDate(day.date)}</span></span></label>
                  <span className={styles.sessionMinutes}>{session.minutes}m</span>
                  <button type="button" className={styles.iconButton} aria-label={`Prepare ${session.topicName}, session ${index + 1} on ${formatDate(day.date)}`} disabled={locked || dirty || completedSet.has(session.id)} onClick={() => prepare(session)}>{completedSet.has(session.id) ? <Check size={16} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}</button>
                </div>{index < day.sessions.length - 1 && committed!.breakMinutes > 0 && <p className={styles.break}>{committed!.breakMinutes}-minute break</p>}
              </li>)}</ol> : <p className={styles.freeDay}>No sessions needed today. Keep this time free or use it to catch up.</p>}</div>
            </section>)}
          </div>
          {pages > 1 && <nav className={styles.pagination} aria-label="Study plan days"><button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous days</button><span>{page * 7 + 1}–{Math.min((page + 1) * 7, plan.days.length)} of {plan.days.length} study days</span><button type="button" disabled={page >= pages - 1} onClick={() => setPage(value => value + 1)}>Next days</button></nav>}
          <p className={styles.planNote}>Budget: {committed!.availableMinutes} minutes per study day, including breaks. Focus: {committed!.workMinutes} minutes. Break: {committed!.breakMinutes} minutes. {calculator ? 'Only complete sessions are counted.' : 'Topics rotate and sessions are spread across your selected days.'}</p>
        </>}
      </div>
    </div>
    <div className={styles.storage}>
      {conflict ? <><p role="status">This plan changed in another tab. Saving is paused so neither version is overwritten silently.</p><div className={styles.actions}><button type="button" disabled={locked} onClick={() => resolveConflict(false)}>Load other version</button><button type="button" disabled={locked} onClick={() => resolveConflict(true)}>Keep this version</button></div></>
        : <><p>{storageStatus}</p>{storageFailed ? <button type="button" onClick={() => setRetry(value => value + 1)}>Retry saving</button> : null}</>}
      <p>Plans stay on this device until you clear browser data. The timer resets when you leave this page.</p>
    </div>
    <UnsavedChangesGuard dirty={guardLeaving} onDiscard={() => setLeaveAllowed(true)} className={styles.leaveDialog} copy={{
      title: selection ? 'Leave this session?' : 'Leave without saving this version?',
      message: selection ? 'Leaving resets this page’s timer. Any plan edits that could not be saved will also be lost.' : 'This version has not been saved in your browser. Stay here to resolve the save issue or download your generated plan.',
      keep: 'Stay here', discard: 'Leave page',
    }} />
  </section>
}
