'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarDays, Download, Sprout, Play, Check } from 'lucide-react'
import { addDays, calculatePomodoros, dateKeyLocal } from '@/lib/studyPlanner'
import { EXAM_PLANNER_KEY, parseExamSnapshot, type ExamPlan, type ExamTimer, type ExamSnapshot } from '@/lib/examPlannerStorage'
import PlannerSessionTimer from './PlannerSessionTimer'
import UnsavedChangesGuard from '@/components/journal/UnsavedChangesGuard'
import shared from './StudyPlanner.module.css'
import styles from './ExamStudyPlanner.module.css'

const formatDate = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
type Plan = ExamPlan

export default function ExamStudyPlanner() {
  const [exam, setExam] = useState('')
  const [deadline, setDeadline] = useState('')
  const [hours, setHours] = useState('2')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [page, setPage] = useState(0)
  const [selection, setSelection] = useState<{ day: number; block: number } | null>(null)
  const [completed, setCompleted] = useState<string[]>([])
  const [leaveAllowed, setLeaveAllowed] = useState(false)
  const [ready, setReady] = useState(false)
  const [savedTimer, setSavedTimer] = useState<ExamTimer | null>(null)
  const [storageError, setStorageError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [retry, setRetry] = useState(0)
  const lastSaved = useRef<string | null>(null)
  const blocked = useRef(false)
  const updateTimer = useCallback((timer: ExamTimer) => setSavedTimer(timer), [])
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(EXAM_PLANNER_KEY)
      lastSaved.current = raw
      if (raw) {
        const saved = parseExamSnapshot(raw)
        setExam(saved.exam); setDeadline(saved.deadline); setHours(saved.hours)
        setPlan(saved.plan); setPage(saved.page); setCompleted(saved.completed)
        setSelection(saved.selection); setSavedTimer(saved.timer)
      }
    } catch {
      blocked.current = true
      setStorageError('The saved plan could not be loaded. Download any current plan before replacing the saved copy.')
    }
    setReady(true)
  }, [])
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if ((event.key === EXAM_PLANNER_KEY || event.key === null) && event.newValue !== lastSaved.current) {
        blocked.current = true; setConflict(true)
        setStorageError('The plan changed in another tab. Saving is paused. Reload to use that version, or keep this version.')
      }
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [])
  useEffect(() => {
    if (!ready || blocked.current) return
    try {
      if (window.localStorage.getItem(EXAM_PLANNER_KEY) !== lastSaved.current) {
        blocked.current = true; setConflict(true)
        setStorageError('The plan changed in another tab. Saving is paused. Reload to use that version, or keep this version.')
        return
      }
      const snapshot: ExamSnapshot = { version: 1, exam, deadline, hours, plan, page, completed, selection, timer: savedTimer }
      const raw = JSON.stringify(snapshot)
      window.localStorage.setItem(EXAM_PLANNER_KEY, raw)
      lastSaved.current = raw
      setStorageError('')
    } catch { setStorageError('Changes could not be saved in this browser. Retry saving or download your plan before leaving.') }
  }, [ready, exam, deadline, hours, plan, page, completed, selection, savedTimer, retry])
  const retrySaving = () => {
    try {
      // Explicitly choosing this version acknowledges another tab or an unreadable snapshot.
      if (blocked.current) lastSaved.current = window.localStorage.getItem(EXAM_PLANNER_KEY)
      blocked.current = false; setConflict(false); setRetry(value => value + 1)
    } catch { setStorageError('Browser storage is unavailable. Download your plan before leaving.') }
  }
  const trigger = useRef<HTMLButtonElement | null>(null)
  const locked = selection !== null
  useEffect(() => {
    if (!storageError || leaveAllowed) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [storageError, leaveAllowed])
  const prepare = (day: number, block: number, button: HTMLButtonElement) => {
    trigger.current = button
    setSavedTimer(null)
    setSelection({ day, block })
  }
  const closeTimer = () => {
    setSelection(null)
    setSavedTimer(null)
    requestAnimationFrame(() => {
      if (trigger.current && !trigger.current.disabled) trigger.current.focus()
      else heading.current?.focus()
    })
  }
  const form = useRef<HTMLFormElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const stale = plan && (exam.trim() !== plan.exam || deadline !== plan.deadline || Number(hours) !== plan.hours)

  function generate(event: FormEvent) {
    event.preventDefault()
    if (locked) return
    const start = dateKeyLocal(new Date())
    const days = (Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000
    const next: Record<string, string> = {}
    if (!exam.trim() || exam.trim().length > 80) next.exam = 'Enter an exam name of 1–80 characters.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || !Number.isInteger(days) || days < 1 || days > 90) next.deadline = 'Choose an exam date from tomorrow to 90 days from today.'
    const minutes = Number(hours) * 60
    if (!hours.trim() || !Number.isInteger(minutes) || minutes < 30 || minutes > 480) next.hours = 'Enter 0.5–8 hours per day, in whole minutes (for example, 1.5).'
    setErrors(next)
    if (Object.keys(next).length) {
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    const capacity = calculatePomodoros(minutes, 25, 5)
    setPlan({ exam: exam.trim(), deadline, start, days, hours: Number(hours), sessions: capacity.sessions, dailyMinutes: capacity.totalMinutes, spare: capacity.unusedMinutes })
    setCompleted([])
    setPage(0)
    requestAnimationFrame(() => heading.current?.focus())
  }

  function download() {
    if (!plan) return
    const lines = [`${plan.exam} — Pomodoro study plan`, `Exam: ${plan.deadline}`, '25-minute focus blocks; 5-minute breaks between blocks. No break after the last block.', 'Choose your own topics for each Pomodoro.', '']
    for (let day = 0; day < plan.days; day++) {
      lines.push(formatDate(addDays(plan.start, day)))
      for (let block = 0; block < plan.sessions; block++) {
        lines.push(`  Pomodoro ${block + 1} — 25 min`)
      }
      if (plan.sessions > 1) lines.push('  5-minute breaks between Pomodoros.')
      lines.push('')
    }
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'exam-study-plan.txt'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const fieldProps = (key: string) => ({ 'aria-invalid': Boolean(errors[key]), 'aria-describedby': `${key}-help${errors[key] ? ` ${key}-error` : ''}` })
  const error = (key: string) => errors[key] && <span className={shared.error} id={`${key}-error`}>{errors[key]}</span>

  if (!ready) return <section id="study-planner" className={`${shared.planner} ${shared.loading}`} aria-busy="true"><p role="status">Restoring your planner…</p></section>

  return <section id="study-planner" className={`${shared.planner} ${styles.planner}`} aria-label="Exam study plan builder">
    <div className={shared.toolbar}><p><CalendarDays size={18} aria-hidden="true" />Your exam, one session at a time</p><span>Free · No sign-up · 25 / 5 rhythm</span></div>
    <div className={shared.storage}>
      <p role="status">{storageError || 'Saved automatically in this browser, including your timer. No account sync.'}</p>
      {storageError && <div className={shared.actions}>{conflict && <button type="button" onClick={() => window.location.reload()}>Reload saved version</button>}<button type="button" onClick={retrySaving}>{blocked.current ? 'Keep this version' : 'Retry saving'}</button></div>}
    </div>
    <div className={shared.workspace}>
      <form ref={form} onSubmit={generate} noValidate className={shared.form}>
        <fieldset disabled={locked}><p className={shared.eyebrow}>Start with your time</p>
        <h2 className={shared.formTitle}>Three details. A clear plan.</h2>
        <label className={shared.field} htmlFor="exam-name">What exam are you preparing for?</label>
        <input id="exam-name" value={exam} onChange={e => setExam(e.target.value)} placeholder="e.g. Biology final" maxLength={80} required {...fieldProps('exam')} />
        <p id="exam-help" className={shared.help}>A subject, qualification, or course name.</p>{error('exam')}
        <label className={shared.field} htmlFor="exam-date">Exam date</label>
        <input id="exam-date" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required {...fieldProps('deadline')} />
        <p id="deadline-help" className={shared.help}>Study from today until the day before your exam. Up to 90 days.</p>{error('deadline')}
        <label className={shared.field} htmlFor="exam-hours">Available hours per day</label>
        <input id="exam-hours" type="number" inputMode="decimal" min="0.5" max="8" step="any" value={hours} onChange={e => setHours(e.target.value.slice(0, 64))} required {...fieldProps('hours')} />
        <p id="hours-help" className={shared.help}>Include breaks. Use 1.5 for an hour and a half. Every day is a study day.</p>{error('hours')}
        <button className={`${shared.primary} ${styles.generate}`} type="submit">{plan ? 'Rebuild my plan' : 'Create my study plan'}<ArrowRight size={17} aria-hidden="true" /></button>
        <p className={shared.help}>Choose your own topics from your syllabus. This planner organizes your time; it does not assess exam readiness.</p>
        </fieldset>{locked && <p className={shared.help}>Close the timer to edit your plan.</p>}
      </form>
      <div className={styles.result}>
        {!plan ? <div className={styles.preview}>
          <Sprout size={32} strokeWidth={1.5} aria-hidden="true" />
          <p className={shared.eyebrow}>Small sessions. Steady preparation.</p>
          <h2>Your deadline becomes<br />a daily next step.</h2>
          <div className={styles.rhythm} aria-label="25 minutes focus, 5 minutes break, repeat"><span><b>25</b>min focus</span><span aria-hidden="true">+</span><span><b>05</b>min break</span></div>
          <p className={shared.help}>For example: 2 hours a day fits 4 Pomodoros, 15 minutes of breaks, and 5 spare minutes.</p>
        </div> : <>
          <p className={shared.eyebrow}>Your preparation roadmap</p>
          <h2 ref={heading} tabIndex={-1} className={styles.resultTitle}>{plan.exam}</h2>
          <p className={shared.help}>Exam: {formatDate(plan.deadline)} · {formatDate(plan.start)} – {formatDate(addDays(plan.deadline, -1))}</p>
          <p role="status" className={styles.notice}>{stale ? 'Details changed. Rebuild to update the plan below.' : 'Your plan is ready. Your progress saves automatically in this browser.'}</p>
          <dl className={styles.stats}><div><dt>Study days</dt><dd>{plan.days}</dd></div><div><dt>Pomodoros / day</dt><dd>{plan.sessions}</dd></div><div><dt>Total focus hours</dt><dd>{Number((plan.days * plan.sessions * 25 / 60).toFixed(1))}</dd></div></dl>
          <p className={shared.help}>{plan.dailyMinutes} minutes scheduled each day, including breaks. {plan.spare} minutes spare. Reserve longer breaks separately.</p>
          <div className={styles.actions}><button type="button" onClick={download}><Download size={16} aria-hidden="true" />Download plan</button><button type="button" className={shared.primary} disabled={locked || Boolean(stale) || completed.length === plan.days * plan.sessions} onClick={event => {
            const index = Array.from({ length: plan.days * plan.sessions }, (_, i) => i).find(i => !completed.includes(`${Math.floor(i / plan.sessions)}:${i % plan.sessions}`))
            if (index !== undefined) prepare(Math.floor(index / plan.sessions), index % plan.sessions, event.currentTarget)
          }}><Play size={16} aria-hidden="true" />Prepare next Pomodoro</button></div>
          <p className={shared.help}>{completed.length} / {plan.days * plan.sessions} completed · Select a Pomodoro, then press Start focus.</p>
          {selection && <PlannerSessionTimer key={`${selection.day}:${selection.block}`} restored={savedTimer} onTimerChange={updateTimer}
            session={{ id: `${selection.day}:${selection.block}`, topicId: 'exam', topicName: `${formatDate(addDays(plan.start, selection.day))} · Pomodoro ${selection.block + 1}`, minutes: 25 }}
            breakMinutes={selection.block < plan.sessions - 1 ? 5 : 0}
            onComplete={id => setCompleted(current => current.includes(id) ? current : [...current, id])} onClose={closeTimer} />}
          <ol className={styles.days} start={page * 7 + 1}>{Array.from({ length: Math.min(7, plan.days - page * 7) }, (_, offset) => {
            const day = page * 7 + offset
            const date = addDays(plan.start, day)
            return <li key={date}><div className={styles.dayHeading}><time dateTime={date}>{formatDate(date)}</time><span>{plan.sessions} × 25 min</span></div><ol className={styles.blocks} aria-label="Daily Pomodoros">{Array.from({ length: plan.sessions }, (_, block) => (
              <li key={block}><button type="button" disabled={locked || Boolean(stale) || completed.includes(`${day}:${block}`)} onClick={event => prepare(day, block, event.currentTarget)} aria-label={`${completed.includes(`${day}:${block}`) ? 'Completed' : 'Prepare'} Pomodoro ${block + 1}, ${formatDate(date)}`}>
                {completed.includes(`${day}:${block}`) ? <Check size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}<strong>Pomodoro {block + 1}</strong><span>{completed.includes(`${day}:${block}`) ? 'Done' : '25 min'}</span>
              </button></li>
            ))}</ol>{plan.sessions > 1 && <p className={styles.breakNote}>5-minute breaks between Pomodoros</p>}</li>
          })}</ol>
          {plan.days > 7 && <nav className={shared.pagination} aria-label="Study schedule pages"><button type="button" disabled={locked || page === 0} onClick={() => setPage(p => p - 1)}>Previous</button><span>Days {page * 7 + 1}–{Math.min(plan.days, page * 7 + 7)} of {plan.days}</span><button type="button" disabled={locked || (page + 1) * 7 >= plan.days} onClick={() => setPage(p => p + 1)}>Next</button></nav>}
          <p className={shared.help}>Need days off or specific topic estimates? <Link href="/exam-revision-planner">Customize a revision timetable ↗</Link></p>
        </>}
      </div>
    </div>
    <UnsavedChangesGuard className={shared.leaveDialog} dirty={Boolean(storageError) && !leaveAllowed} onDiscard={() => setLeaveAllowed(true)} copy={{ title: 'Leave without saving?', message: 'Recent changes could not be saved. Stay to retry saving or download your plan before leaving.', keep: 'Stay here', discard: 'Leave page' }} />
  </section>
}
