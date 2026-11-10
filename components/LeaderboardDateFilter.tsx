'use client'

import { useId, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { es } from 'react-day-picker/locale'
import { useI18n } from '@/components/I18nProvider'
import { leaderboardCopy } from '@/lib/i18n/leaderboard'
import type { LeaderboardPeriod } from '@/lib/leaderboardPeriod'
import 'react-day-picker/dist/style.css'
import '@/app/leaderboard/leaderboard.css'

export interface LeaderboardDateView {
  period: LeaderboardPeriod
  offset: number
  start: string
  end: string
}

export default function LeaderboardDateFilter({ view, onChange, periodLabel, loading }: {
  view: LeaderboardDateView
  onChange: (patch: Partial<LeaderboardDateView>) => void
  periodLabel?: string
  loading: boolean
}) {
  const { language, t } = useI18n()
  const copy = leaderboardCopy[language]
  const locale = language === 'es' ? 'es-ES' : 'en-US'
  const calendarId = useId()
  const [showCalendar, setShowCalendar] = useState(false)
  const [draftRange, setDraftRange] = useState<DateRange>()
  const calendarTrigger = useRef<HTMLButtonElement>(null)
  const periods = [{ value: 'day', label: t.leaderboard.today }, { value: 'week', label: t.leaderboard.week }, { value: 'month', label: t.leaderboard.month }, { value: 'year', label: t.leaderboard.year }] as const
  const closeCalendar = () => { setShowCalendar(false); calendarTrigger.current?.focus() }
  const draftLabel = draftRange?.from
    ? `${draftRange.from.toLocaleDateString(locale)} — ${draftRange.to ? draftRange.to.toLocaleDateString(locale) : copy.rangeEnd}`
    : copy.rangeEmpty

  return (
    <section className="pixel-panel lb-controls" aria-label={t.leaderboard.customRange}>
      <div className="lb-toolbar">
        <div className="lb-periods" role="group" aria-label={copy.currentPeriod}>
          {periods.map(period => <button key={period.value} type="button" aria-pressed={view.period === period.value} onClick={() => { onChange({ period: period.value, offset: 0 }); setShowCalendar(false) }}>{period.label}</button>)}
        </div>
        <div className="lb-date-nav">
          <button className="lb-icon-button" type="button" aria-label={copy.previousPeriod} title={copy.previousPeriod} disabled={view.period === 'custom' || view.offset >= 1000} onClick={() => onChange({ offset: view.offset + 1 })}><ChevronLeft size={18} /></button>
          <button className="lb-date-trigger" ref={calendarTrigger} type="button" aria-expanded={showCalendar} aria-controls={calendarId} onClick={() => {
            if (!showCalendar) setDraftRange(view.start && view.end ? { from: new Date(view.start), to: new Date(view.end) } : undefined)
            setShowCalendar(value => !value)
          }}>
            <CalendarDays size={16} aria-hidden="true" />
            <span>{loading ? t.leaderboard.customRange : periodLabel || t.leaderboard.customRange}</span>
          </button>
          <button className="lb-icon-button" type="button" aria-label={copy.nextPeriod} title={copy.nextPeriod} disabled={view.offset === 0 || view.period === 'custom'} onClick={() => onChange({ offset: Math.max(0, view.offset - 1) })}><ChevronRight size={18} /></button>
        </div>
      </div>
      {showCalendar && <div id={calendarId} className="lb-calendar" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); closeCalendar() } }}>
        <div className="lb-calendar-copy">
          <span className="lb-eyebrow"><CalendarDays size={16} aria-hidden="true" />{t.leaderboard.customRange}</span>
          <h2>{t.leaderboard.customRange}</h2>
          <p>{copy.rangeHint}</p>
          <p className="lb-range-selection" aria-live="polite">{draftLabel}</p>
          <div className="lb-calendar-actions">
            <button type="button" className="btn btn-primary" disabled={!draftRange?.from || !draftRange?.to} onClick={() => {
              if (!draftRange?.from || !draftRange?.to) return
              onChange({ period: 'custom', offset: 0, start: draftRange.from.toISOString(), end: draftRange.to.toISOString() })
              closeCalendar()
            }}>{t.leaderboard.apply}</button>
            <button type="button" className="lb-button" onClick={closeCalendar}>{t.leaderboard.cancel}</button>
          </div>
        </div>
        <DayPicker mode="range" selected={draftRange} onSelect={setDraftRange} defaultMonth={draftRange?.from} locale={language === 'es' ? es : undefined} />
      </div>}
    </section>
  )
}
