'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Check, Clock3, Flag, Pencil, Target, Timer, Trash2 } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { dailyGoalCopy } from '@/lib/i18n/dailyGoal'
import { DEFAULT_DAY_GOAL, DEFAULT_TIME_GOAL, isValidDailyGoal, useDailyGoal, type DayGoalType } from '@/hooks/useDailyGoal'
import { useTodayStats } from '@/hooks/useTodayStats'
import { useAuthStore } from '@/store/useAuthStore'

export default function DailyGoal({ isVisible = true }: { isVisible?: boolean }) {
  const { language } = useI18n()
  const copy = dailyGoalCopy[language]
  const { goal, isLoaded, error: storageError, saveGoal, removeGoal, clearError } = useDailyGoal()
  const { data, error, isLoading, isValidating, refresh } = useTodayStats(isVisible)
  const userId = useAuthStore(state => state.user?.id)
  const [editing, setEditing] = useState(false)
  const [draftType, setDraftType] = useState<DayGoalType>('pomodoros')
  const [draft, setDraft] = useState(String(DEFAULT_DAY_GOAL))
  const [invalid, setInvalid] = useState(false)
  const [notice, setNotice] = useState<'saved' | 'removed' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLButtonElement>(null)
  const fieldId = useId()
  const format = (value: number) => value.toLocaleString(language === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 1 })
  const sessions = data?.currentUser?.pomodoros ?? 0
  const minutes = data?.currentUser?.focusMinutes ?? 0
  const hasStats = Boolean(data) && !isLoading
  const current = goal?.type === 'time' ? minutes : sessions
  const target = goal ? goal.value * (goal.type === 'time' ? 60 : 1) : 0
  const complete = hasStats && target > 0 && current >= target
  const progress = target > 0 && hasStats ? Math.min(100, current / target * 100) : 0
  const unit = goal?.type === 'time' ? copy.minutes : copy.sessions
  const validation = draftType === 'time' ? copy.invalidTime : copy.invalidSessions

  useEffect(() => {
    setEditing(false)
    setInvalid(false)
    setNotice(null)
  }, [userId])

  useEffect(() => {
    if (editing && isVisible) inputRef.current?.focus({ preventScroll: true })
  }, [editing, isVisible])

  const startEditing = () => {
    clearError()
    setNotice(null)
    setInvalid(false)
    setDraftType(goal?.type ?? 'pomodoros')
    setDraft(String(goal?.value ?? DEFAULT_DAY_GOAL))
    setEditing(true)
  }

  const closeEditor = () => {
    setEditing(false)
    setInvalid(false)
    clearError()
    requestAnimationFrame(() => editRef.current?.focus({ preventScroll: true }))
  }

  const save = (event: FormEvent) => {
    event.preventDefault()
    const nextGoal = { type: draftType, value: Number(draft.trim().replace(',', '.')) }
    if (!isValidDailyGoal(nextGoal)) {
      setInvalid(true)
      inputRef.current?.focus()
      return
    }
    if (saveGoal(nextGoal)) {
      setNotice('saved')
      closeEditor()
    }
  }

  return (
    <div className="personal-goal" data-complete={complete} data-no-translate>
      {goal && <div className="personal-goal-topline">
        <span className="personal-goal-day"><Target size={15} aria-hidden="true" />{copy.today}</span>
        {!editing && <button ref={editRef} type="button" className="personal-goal-edit" onClick={startEditing}><Pencil size={13} aria-hidden="true" />{copy.edit}</button>}
      </div>}

      {goal ? (
        <section className="personal-goal-display" aria-label={copy.title} aria-busy={isLoading}>
          <div className="personal-goal-counter">
            <strong>{hasStats ? format(current) : '—'}</strong>
            <span>/ {format(target)}<small>{unit}</small></span>
            <span className="personal-goal-emblem" aria-hidden="true">{complete ? <Check size={25} strokeWidth={2} /> : <Flag size={25} strokeWidth={1.5} />}</span>
          </div>
          <div className="personal-goal-meter" role="progressbar" aria-label={copy.title} aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={hasStats ? Math.floor(progress) : undefined}
            aria-valuetext={hasStats ? `${format(current)} / ${format(target)} ${unit}` : error ? copy.loadError : copy.loading}>
            {Array.from({ length: 20 }, (_, index) => (
              <span key={index}><i style={{ transform: `scaleX(${Math.max(0, Math.min(1, progress / 5 - index))})` }} /></span>
            ))}
          </div>
          <div className="personal-goal-progress-caption">
            <span>{complete ? copy.achieved : hasStats ? copy.remaining.replace('{value}', format(Math.max(0, target - current))).replace('{unit}', unit) : error ? '—' : copy.loading}</span>
            <strong>{hasStats ? `${Math.floor(progress)}%` : '—'}</strong>
          </div>
        </section>
      ) : !editing && (
        <div className="personal-goal-empty">
          <span className="personal-goal-empty-icon" aria-hidden="true"><Target size={30} strokeWidth={1.5} /></span>
          <h2>{copy.empty}</h2>
          <p>{copy.emptyDescription}</p>
          <button ref={editRef} type="button" className="personal-goal-button personal-goal-primary" disabled={!isLoaded} onClick={startEditing}>{copy.set}</button>
        </div>
      )}

      {editing && (
        <form className="personal-goal-editor" noValidate onSubmit={save} onKeyDown={event => {
          if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
            event.preventDefault()
            event.stopPropagation()
            closeEditor()
          }
          if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault()
        }}>
          <div className="personal-goal-types" role="group" aria-label={copy.target}>
            {(['pomodoros', 'time'] as const).map(type => (
              <button key={type} type="button" aria-pressed={draftType === type} onClick={() => {
                setDraftType(type)
                setDraft(String(goal?.type === type ? goal.value : type === 'time' ? DEFAULT_TIME_GOAL : DEFAULT_DAY_GOAL))
                setInvalid(false)
              }}>{type === 'time' ? <Clock3 size={15} aria-hidden="true" /> : <Timer size={15} aria-hidden="true" />}{copy[type]}</button>
            ))}
          </div>
          <label htmlFor={fieldId}>{copy.target} <span>({draftType === 'time' ? copy.hours : copy.sessions})</span></label>
          <input ref={inputRef} id={fieldId} type="text" inputMode={draftType === 'time' ? 'decimal' : 'numeric'} value={draft}
            maxLength={8} onChange={event => { setDraft(event.target.value); setInvalid(false) }}
            aria-invalid={invalid || undefined} aria-describedby={`${fieldId}-hint`} />
          <div className="personal-goal-presets" role="group" aria-label={copy.target}>
            {(draftType === 'time' ? [1, 2, 4, 6] : [2, 4, 6, 8]).map(value => <button type="button" key={value}
              aria-pressed={Number(draft.replace(',', '.')) === value} onClick={() => { setDraft(String(value)); setInvalid(false) }}>{format(value)}</button>)}
          </div>
          <p id={`${fieldId}-hint`} className={invalid ? 'personal-goal-error' : 'personal-goal-hint'}>{validation}</p>
          <div className="personal-goal-actions">
            <button type="submit" className="personal-goal-button personal-goal-primary">{copy.save}</button>
            <button type="button" className="personal-goal-button" onClick={closeEditor}>{copy.cancel}</button>
          </div>
          {goal && <button type="button" className="personal-goal-remove" onClick={() => {
            if (removeGoal()) { setNotice('removed'); closeEditor() }
          }}><Trash2 size={13} aria-hidden="true" />{copy.remove}</button>}
        </form>
      )}

      {storageError && <p className="personal-goal-error" role="alert">{copy.storageError}</p>}
      {error && <div className="personal-goal-error" role="status"><span>{copy.loadError}</span><button type="button" disabled={isValidating} onClick={() => { void refresh().catch(() => undefined) }}>{copy.retry}</button></div>}

      <div className="personal-goal-totals" aria-busy={isLoading}>
        <div><Timer size={15} aria-hidden="true" /><strong>{hasStats ? format(sessions) : '—'}</strong><span>{copy.completedSessions}</span></div>
        <div><Clock3 size={15} aria-hidden="true" /><strong>{hasStats ? format(minutes) : '—'}</strong><span>{copy.focusedMinutes}</span></div>
      </div>
      <span className="sr-only" role="status">{notice ? copy[notice] : complete ? copy.achieved : ''}</span>
    </div>
  )
}
