'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, Check, CheckCheck, ChevronLeft, ChevronRight, Clock, History, ListTodo, Pencil, Plus, SkipForward, Sparkles, Trash2 } from 'lucide-react'
import PomodoroTimer from '@/components/PomodoroTimer'
import { TaskPicker } from '@/components/TaskPicker'
import { useTaskMenu } from '@/hooks/useTaskMenu'
import { SessionType } from '@/types'
import { useI18n } from '@/components/I18nProvider'
import { dailyFlowCopy } from '@/lib/i18n/dailyFlow'
import { dayFocus, localDay, settleCursor, taskFocus } from '@/lib/dailyFlow'
import { restoreGuestFlowTimer, useDailyFlowStore } from '@/store/useDailyFlowStore'
import { useTimerStore } from '@/store/useTimerStore'
import { useTimerActionsStore } from '@/store/useTimerActionsStore'
import { registerServiceWorker } from '@/lib/serviceWorker'

export default function DailyFlow({ onExit, onSessionComplete }: { onExit: () => void; onSessionComplete?: () => Promise<void> }) {
  const { language } = useI18n()
  const copy = dailyFlowCopy[language]
  const { data, ready, error, update, syncTimer, retry, reload } = useDailyFlowStore()
  const storageKey = useDailyFlowStore(state => state.storageKey)
  const restorePending = useDailyFlowStore(state => state.restorePending)
  const { startFocus, busy: timerBusy } = useTimerActionsStore()
  const session = useTimerStore(state => state.currentSession)
  const [history, setHistory] = useState(false)
  const [historyDay, setHistoryDay] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editError, setEditError] = useState('')
  const [adding, setAdding] = useState(false)
  const [notice, setNotice] = useState('')
  const [celebration, setCelebration] = useState(0)
  const [busy, setBusy] = useState(false)
  const [removed, setRemoved] = useState<{ id: string; index: number } | null>(null)
  const pendingStart = useRef(false)
  const actionPending = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const historyHeadingRef = useRef<HTMLHeadingElement>(null)
  const locked = error === 'conflict' || error === 'invalid'
  const controlsLocked = locked || restorePending
  const taskMenu = useTaskMenu(controlsLocked || busy)
  const { setIsTaskMenuOpen } = taskMenu
  const taskOptions = useTimerStore(state => state.taskOptions)
  const unavailableTaskIds = data.tasks.filter(task => !task.deleted && (data.queue.includes(task.id) || task.completedDay === data.day)).flatMap(task => task.sourceTaskId ? [task.sourceTaskId] : [])
  const queue = data.queue.map(id => data.tasks.find(task => task.id === id)!).filter(Boolean)
  const current = queue[0]
  const completed = data.tasks.filter(task => task.completedDay === data.day)
  const focusing = data.phase === 'focus' && Boolean(current)
  const summary = data.phase === 'done' || data.phase === 'finished'
  const carry = queue.some(task => task.createdDay < data.day)
  const days = Array.from(new Set(data.tasks.flatMap(task => [
    ...(task.completedDay ? [task.completedDay] : []), ...Object.keys(task.focusByDay),
  ]))).sort().reverse()
  const selectedDay = days.includes(historyDay) ? historyDay : days[0]
  const dayIndex = days.indexOf(selectedDay)
  const historyTasks = data.tasks.filter(task => task.completedDay === selectedDay)
  const workedOn = data.tasks.filter(task => task.completedDay !== selectedDay && (task.focusByDay[selectedDay] ?? 0) > 0)
  const duration = (seconds: number) => {
    const total = Math.floor(seconds)
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor(total % 3600 / 60)
    return hours ? `${hours} h ${minutes} min` : minutes ? `${minutes} min` : `${total} s`
  }
  const dateLabel = (day: string) => new Intl.DateTimeFormat(language, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${day}T12:00:00`))

  useEffect(() => { registerServiceWorker() }, [])
  useEffect(() => {
    restoreGuestFlowTimer()
  }, [ready, locked, storageKey])
  useEffect(() => {
    useDailyFlowStore.setState({ engaged: ready && focusing && !locked })
    if (ready && focusing && !locked) syncTimer()
    return () => { useDailyFlowStore.setState({ engaged: false }) }
  }, [ready, focusing, locked, storageKey, syncTimer])
  useEffect(() => {
    if (!pendingStart.current || !startFocus || !focusing || controlsLocked) return
    pendingStart.current = false
    if (!useTimerStore.getState().currentSession) void startFocus()
  }, [startFocus, focusing, controlsLocked])
  useEffect(() => {
    if (!ready) return
    const heading = history ? historyHeadingRef.current : headingRef.current
    heading?.focus({ preventScroll: true })
  }, [ready, data.phase, history])

  useEffect(() => {
    setEditing(null)
    setRemoved(null)
    setNotice('')
    setIsTaskMenuOpen(false)
    pendingStart.current = false
  }, [storageKey, setIsTaskMenuOpen])

  const previousEdit = useRef<string | null>(null)
  useEffect(() => {
    if (previousEdit.current && editing === null) document.getElementById(`flow-edit-action-${previousEdit.current}`)?.focus()
    previousEdit.current = editing
  }, [editing])

  const begin = () => {
    if (locked || actionPending.current) return
    pendingStart.current = true
    const success = update(next => {
      next.day = localDay()
      if (next.queue.length) next.phase = 'focus'
    })
    if (!success) pendingStart.current = false
  }
  const changeTask = async (complete: boolean) => {
    if (!current || controlsLocked || actionPending.current || timerBusy) return
    if (!complete && queue.length < 2) return
    actionPending.current = true
    setBusy(true)
    try {
      syncTimer()
      // Ending the queue uses the timer's existing stop/persistence/socket flow.
      if (complete && queue.length === 1) await useTimerActionsStore.getState().stopSession?.()
      const success = update(next => {
        if (next.queue[0] !== current.id) return
        settleCursor(next, Date.now())
        const id = next.queue.shift()!
        const task = next.tasks.find(item => item.id === id)!
        if (complete) { task.completedDay = localDay(); task.completedAt = new Date().toISOString() }
        else next.queue.push(id)
        if (next.cursor) next.cursor.taskId = next.queue[0] ?? id
        if (!next.queue.length) { next.phase = 'done'; next.cursor = null; next.timer = null }
      })
      if (success) {
        setNotice(complete ? copy.taskDone : copy.skipped)
        if (complete) setCelebration(value => value + 1)
      }
    } finally { actionPending.current = false; setBusy(false) }
  }
  const editList = async () => {
    if (actionPending.current || timerBusy || controlsLocked) return
    actionPending.current = true
    setBusy(true)
    try {
      syncTimer()
      await useTimerActionsStore.getState().stopSession?.()
      update(next => { next.phase = 'planning'; next.cursor = null; next.timer = null })
    } finally { actionPending.current = false; setBusy(false) }
  }
  const composer = <div className="flow-project-picker">
    <p className="flow-task-picker-label">{copy.tasks}</p>
    <TaskPicker key={storageKey} variant="daily-flow" sessionType={SessionType.WORK}
      isDisabled={controlsLocked || busy} isOpen={taskMenu.isTaskMenuOpen && !history}
      onToggle={() => taskMenu.setIsTaskMenuOpen(value => !value)} onClose={() => taskMenu.setIsTaskMenuOpen(false)}
      taskPickerRef={taskMenu.taskPickerRef} taskDropdownRef={taskMenu.taskDropdownRef}
      selectedTask={null} filteredTaskOptions={taskOptions} hasTaskOptions={taskOptions.length > 0}
      taskSearch={taskMenu.taskSearch} onTaskSearchChange={taskMenu.setTaskSearch}
      triggerLabel={copy.fromProjects} unavailableTaskIds={unavailableTaskIds} unavailableLabel={copy.alreadyAdded}
      onSelectTask={task => {
        if (!task?.parentId || controlsLocked || busy) return
        const success = update(next => {
          if (next.tasks.some(item => item.sourceTaskId === task.id && !item.deleted && (next.queue.includes(item.id) || item.completedDay === next.day))) return
          const id = crypto.randomUUID()
          const projectTitle = task.parentId ? taskOptions.find(option => option.id === task.parentId)?.title ?? task.projectTitle : undefined
          next.tasks.push({ id, title: task.title, sourceTaskId: task.id, sourceProjectTitle: projectTitle,
            createdDay: localDay(), completedDay: null, completedAt: null, focusByDay: {} })
          next.queue.push(id)
        })
        if (success) {
          setNotice(copy.imported)
          // Re-adding the removed source replaces its pending Undo action.
          if (removed && data.tasks.find(item => item.id === removed.id)?.sourceTaskId === task.id) setRemoved(null)
        }
      }} />
    {focusing && <button type="button" className="flow-link" onClick={() => setAdding(false)}>{copy.cancel}</button>}
  </div>

  return <div className="daily-flow-content" data-no-translate>
    <div className="flow-surface">
    <header className="flow-header">
      <button type="button" className="flow-back" onClick={onExit}><ArrowLeft size={16} />Pomodoro</button>
      <span className="flow-wordmark"><ListTodo size={17} />{copy.title}<span className="daily-flow-beta">Beta</span></span>
      <button type="button" className="flow-link" aria-pressed={history} onClick={() => { setHistory(value => !value); setNotice('') }}>
        {history ? <ListTodo size={16} /> : <History size={16} />}{history ? copy.today : copy.history}
      </button>
    </header>
    {!ready ? <p className="flow-loading" role="status">{copy.loading}</p> : <>
      {error && <div className="flow-error" role="alert"><p>{copy[error]}</p>
        {error === 'storage' && <button type="button" className="btn btn-secondary" onClick={retry}>{copy.retry}</button>}
        {(error === 'conflict' || error === 'invalid') && <button type="button" className="btn btn-secondary" onClick={reload}>{copy.reload}</button>}
      </div>}
      {history && <section className="flow-history">
        <h1 ref={historyHeadingRef} tabIndex={-1}>{copy.historyTitle}</h1><p className="flow-muted">{copy.historyHint}</p>
        {!selectedDay ? <div className="flow-empty"><History size={32} /><p>{copy.noHistory}</p></div> : <>
          <div className="flow-day-nav">
            <button type="button" className="flow-icon" disabled={dayIndex >= days.length - 1} aria-label={copy.previous} title={copy.previous} onClick={() => setHistoryDay(days[dayIndex + 1])}><ChevronLeft size={20} /></button>
            <h2>{dateLabel(selectedDay)}</h2>
            <button type="button" className="flow-icon" disabled={dayIndex <= 0} aria-label={copy.next} title={copy.next} onClick={() => setHistoryDay(days[dayIndex - 1])}><ChevronRight size={20} /></button>
          </div>
          <dl className="flow-metrics"><div><dt>{copy.tasksDone}</dt><dd>{historyTasks.length}</dd></div><div><dt>{copy.dailyFocusTime}</dt><dd>{duration(dayFocus(data, selectedDay))}</dd></div></dl>
          {historyTasks.length > 0 && <ul className="flow-results">{historyTasks.map(task => <li key={task.id}><Check size={18} /><span>{task.title}<small>{copy.totalTaskTime}: {duration(taskFocus(task))}</small></span><span className="flow-time">{duration(task.focusByDay[selectedDay] ?? 0)}<small>{copy.onThisDay}</small></span></li>)}</ul>}
          {workedOn.length > 0 && <><h3>{copy.workedOn}</h3><ul className="flow-results">{workedOn.map(task => <li key={task.id}><Clock size={18} /><span>{task.title}<small>{task.completedDay ? dateLabel(task.completedDay) : copy.inProgress}</small></span><span className="flow-time">{duration(task.focusByDay[selectedDay])}</span></li>)}</ul></>}
        </>}
      </section>}
      <div hidden={history}>{focusing ? <section className="flow-focus">
        <div className="flow-progress"><span>{completed.length} / {completed.length + queue.length} {copy.completed}</span><div role="progressbar" aria-label={copy.tasksDone} aria-valuemin={0} aria-valuemax={completed.length + queue.length} aria-valuenow={completed.length}><span style={{ width: `${completed.length / (completed.length + queue.length) * 100}%` }} /></div></div>
        <p className="flow-eyebrow">{copy.current}</p><h1 ref={headingRef} tabIndex={-1} aria-live="polite" aria-atomic="true" className="flow-current-task"><span key={current.id} className="flow-task-label">{current.title}</span></h1>
        <p className="flow-task-time">{copy.taskTime}: {duration(taskFocus(current))}</p>
        {restorePending && <p className="flow-muted" role="status">{copy.loading}</p>}
        <PomodoroTimer dailyFlow idleTitle="Daily Flow | Pomo Cowork" showRoomSwitch={false} onSessionComplete={onSessionComplete} />
        <div className="flow-task-actions"><button type="button" className="btn flow-complete" disabled={busy || timerBusy || controlsLocked} onClick={() => void changeTask(true)}><Check size={19} />{copy.complete}</button>
          <button type="button" className="flow-link" title={queue.length < 2 ? copy.skipHint : copy.skip} disabled={busy || timerBusy || controlsLocked || queue.length < 2} onClick={() => void changeTask(false)}><SkipForward size={16} />{copy.skip}</button></div>
        <p className="flow-muted flow-focus-hint">{copy.focusHint}</p>
        <div className="flow-status" role="status">{celebration > 0 && <Sparkles key={celebration} className="flow-sparkle" size={18} aria-hidden="true" />}{notice}</div>
        <div className="flow-secondary-actions"><button type="button" className="flow-link" disabled={locked} aria-expanded={adding} onClick={() => setAdding(value => !value)}><Plus size={16} />{copy.quickAdd}</button><button type="button" className="flow-link" title={copy.listHint} disabled={busy || timerBusy || controlsLocked} onClick={() => void editList()}><Pencil size={15} />{copy.list}</button></div>
        {adding && composer}
      </section> : summary ? <section className="flow-summary">
        <div className="flow-finish-art" aria-hidden="true"><CheckCheck size={48} /><span>✦</span><span>✦</span><span>✦</span></div>
        <h1 ref={headingRef} tabIndex={-1}>{data.phase === 'finished' ? copy.finishedTitle : copy.doneTitle}</h1>
        <p className="flow-muted">{data.phase === 'finished' ? copy.finishedHint : copy.doneHint}</p>
        <dl className="flow-metrics"><div><dt>{copy.tasksDone}</dt><dd>{completed.length}</dd></div><div><dt>{copy.focusTime}</dt><dd>{duration(dayFocus(data, data.day))}</dd></div></dl>
        {completed.length > 0 && <details className="flow-summary-details"><summary>{copy.summary}</summary><ul className="flow-results">{completed.map(task => <li key={task.id}><Check size={17} /><span>{task.title}</span><span className="flow-time">{duration(taskFocus(task))}</span></li>)}</ul></details>}
        <div className="flow-actions">{data.phase === 'done' && <button type="button" className="btn btn-primary" disabled={locked} onClick={() => update(next => { next.phase = 'finished' })}><CheckCheck size={18} />{copy.finish}</button>}
          <button type="button" className="btn btn-secondary" disabled={locked} onClick={() => { update(next => { next.phase = 'planning' }); setAdding(true) }}><Plus size={17} />{copy.more}</button></div>
        <button type="button" className="flow-link" onClick={() => setHistory(true)}><History size={16} />{copy.viewHistory}</button>
      </section> : <section className="flow-plan">
        <p className="flow-eyebrow">{copy.tagline}</p><h1 ref={headingRef} tabIndex={-1}>{copy.planTitle}</h1>
        {carry && <aside className="flow-carry"><ListTodo size={20} /><div><strong>{copy.carryTitle}</strong><p>{copy.carryHint}</p></div></aside>}
        {composer}
        {!queue.length ? <p className="flow-empty-plan">{copy.empty}</p> : <ol className="flow-queue">{queue.map((task, index) => <li key={task.id}>
          <span className="flow-order" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          {editing === task.id ? <form className="flow-edit" noValidate onSubmit={event => {
            event.preventDefault()
            if (!editTitle.trim()) { setEditError(copy.emptyTask); return }
            if (update(next => { const item = next.tasks.find(item => item.id === task.id); if (item) item.title = editTitle.trim() })) { setEditing(null); setEditError('') }
          }}><label className="sr-only" htmlFor={`flow-edit-${task.id}`}>{copy.edit}</label><input id={`flow-edit-${task.id}`} className="input" autoFocus maxLength={500} value={editTitle} aria-invalid={Boolean(editError)} aria-describedby={editError ? 'flow-edit-error' : undefined} onChange={event => { setEditTitle(event.target.value); setEditError('') }} onKeyDown={event => { if (event.nativeEvent.isComposing || event.keyCode === 229) { if (event.key === 'Enter') event.preventDefault(); return } if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.form?.requestSubmit() } if (event.key === 'Escape') { setEditing(null); setEditError('') } }} />{editError && <span id="flow-edit-error" role="alert">{editError}</span>}<button type="submit" className="flow-link" disabled={locked}>{copy.save}</button><button type="button" className="flow-link" onClick={() => { setEditing(null); setEditError('') }}>{copy.cancel}</button></form>
            : <span className="flow-queue-title">{task.title}{task.sourceProjectTitle && <small>{task.sourceProjectTitle}</small>}</span>}
          {editing !== task.id && <div className="flow-row-actions">
            <button type="button" className="flow-icon" title={copy.up} aria-label={`${copy.up}: ${task.title}`} disabled={locked || index === 0} onClick={() => update(next => { [next.queue[index - 1], next.queue[index]] = [next.queue[index], next.queue[index - 1]] })}><ArrowUp size={16} /></button>
            <button type="button" className="flow-icon" title={copy.down} aria-label={`${copy.down}: ${task.title}`} disabled={locked || index === queue.length - 1} onClick={() => update(next => { [next.queue[index + 1], next.queue[index]] = [next.queue[index], next.queue[index + 1]] })}><ArrowDown size={16} /></button>
            <button type="button" id={`flow-edit-action-${task.id}`} className="flow-icon" title={copy.edit} aria-label={`${copy.edit}: ${task.title}`} disabled={locked} onClick={() => { setEditing(task.id); setEditTitle(task.title); setEditError('') }}><Pencil size={15} /></button>
            <button type="button" className="flow-icon" title={copy.remove} aria-label={`${copy.remove}: ${task.title}`} disabled={locked} onClick={() => { if (update(next => { next.queue = next.queue.filter(id => id !== task.id); next.tasks.find(item => item.id === task.id)!.deleted = true })) { setRemoved({ id: task.id, index }); setNotice(copy.removed) } }}><Trash2 size={15} /></button>
          </div>}
        </li>)}</ol>}
        <div className="flow-status" role="status">{notice}{removed && <button type="button" className="flow-link" disabled={locked} onClick={() => { update(next => { const task = next.tasks.find(item => item.id === removed.id); if (task) { task.deleted = false; next.queue.splice(Math.min(removed.index, next.queue.length), 0, task.id) } }); setRemoved(null); setNotice('') }}>{copy.undo}</button>}</div>
        {session && <p className="flow-muted">{copy.activeTimer}</p>}
        <button type="button" id="flow-start" className="btn btn-primary flow-start" disabled={locked || editing !== null || !queue.length} onClick={begin}>{carry ? copy.resume : copy.start}<ChevronRight size={18} /></button>
        <p className="flow-storage-note"><Check size={13} />{error ? copy[error] : copy.local}</p>
      </section>}</div>
    </>}
    </div>
  </div>
}
