'use client'

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { CalendarDays, Check, CheckCheck, ChevronLeft, ChevronRight, Flame, Sprout } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { habitsCopy } from '@/lib/i18n/habits'
import { getHabitStatistics, type HabitStatisticsPeriod } from '@/lib/habitStatistics'
import type { Habit } from '@/lib/habits'

const RANKING_PAGE_SIZE = 5

export default function HabitStatistics({ habits, today }: { habits: Habit[]; today: string }) {
  const { language } = useI18n()
  const c = habitsCopy[language].statistics
  const [period, setPeriod] = useState<HabitStatisticsPeriod>(30)
  const [selected, setSelected] = useState(today)
  const [page, setPage] = useState(0)
  const grid = useRef<HTMLDivElement>(null)
  const headingId = useId()
  const helpId = useId()
  const stats = useMemo(() => getHabitStatistics(habits, today, period), [habits, today, period])
  const hasHabits = stats.ranking.length > 0
  useEffect(() => {
    if (grid.current) grid.current.scrollLeft = grid.current.scrollWidth
  }, [today, hasHabits])
  const number = (value: number) => value.toLocaleString(language)
  const percent = (value: number | null) => value === null ? '—' : new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 0 }).format(value)
  const dateLabel = (date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => new Intl.DateTimeFormat(language, options).format(new Date(`${date}T12:00:00`))
  const selection = stats.days.find((day) => day.date === selected) ?? stats.days[stats.days.length - 1]
  const offset = (new Date(`${stats.days[0].date}T12:00:00`).getDay() + 6) % 7
  const columns = Math.ceil((stats.days.length + offset) / 7)
  const months = stats.days.flatMap((day, index) => index === 0 || day.date.endsWith('-01')
    ? [{ date: day.date, column: Math.floor((index + offset) / 7) + 1 }]
    : []).filter((month, index, all) => index === 0 || month.column - all[index - 1].column >= 2)
  const lastPage = Math.max(0, Math.ceil(stats.ranking.length / RANKING_PAGE_SIZE) - 1)
  const currentPage = Math.min(page, lastPage)
  const rankingStart = currentPage * RANKING_PAGE_SIZE

  function moveDay(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const moves: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }
    if (!(event.key in moves) && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? stats.days.length - 1 : Math.max(0, Math.min(stats.days.length - 1, index + moves[event.key]))
    const day = stats.days[target]
    setSelected(day.date)
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${day.date}"]`)?.focus()
  }

  return <section className="habit-statistics" aria-labelledby={headingId}>
    <header className="habit-statistics-heading">
      <div><h2 id={headingId}><Sprout size={19} aria-hidden="true" />{c.title}</h2><p>{c.scope}</p></div>
      <div className="habit-statistics-period" role="group" aria-label={c.period}>
        {([7, 30, 90] as const).map((value) => <button type="button" className="habit-button" key={value} aria-pressed={period === value} onClick={() => { setPeriod(value); setPage(0) }}>{number(value)} {c.days}</button>)}
      </div>
    </header>

    {!hasHabits ? <div className="habit-statistics-empty"><Sprout size={28} aria-hidden="true" /><p>{c.empty}</p></div> : <>
      <div className="habit-statistics-summary">
        <div className="habit-statistics-rate">
          <span className="habit-statistics-label">{c.rate}</span>
          <strong>{percent(stats.rate)}</strong>
          <div className="habit-statistics-meter" aria-hidden="true">{Array.from({ length: 20 }, (_, index) => <i key={index} data-filled={index < Math.round((stats.rate ?? 0) * 20)} />)}</div>
          <span className="habit-statistics-caption">{dateLabel(stats.start)} – {dateLabel(today, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
        <dl className="habit-statistics-metrics">
          <div><dt><CheckCheck size={17} aria-hidden="true" />{c.completions}</dt><dd>{number(stats.completed)}</dd><dd className="habit-statistics-caption">{c.outOf.replace('{count}', number(stats.scheduled))}</dd></div>
          <div><dt><CalendarDays size={17} aria-hidden="true" />{c.perfectDays}</dt><dd>{number(stats.perfectDays)}</dd><dd className="habit-statistics-caption">{c.perfectHint}</dd></div>
          <div><dt><Flame size={17} aria-hidden="true" />{c.bestStreak}</dt><dd>{number(stats.bestStreak)}<span> {c.days}</span></dd><dd className="habit-statistics-caption">{c.streakHint}</dd></div>
        </dl>
      </div>

      <div className="habit-statistics-details">
        <section className="habit-statistics-calendar" aria-label={c.activity}>
          <div className="habit-statistics-subheading"><h3>{c.activity}</h3><span>{c.last90}</span></div>
          <div className="habit-statistics-map-scroll" ref={grid}>
            <div className="habit-statistics-map" style={{ '--habit-map-columns': columns } as CSSProperties}>
              <div className="habit-statistics-months" aria-hidden="true">{months.map((month) => <span key={month.date} style={{ gridColumn: month.column }}>{dateLabel(month.date, { month: 'short' })}</span>)}</div>
              <div className="habit-statistics-weekdays" aria-hidden="true">{[0, 2, 4, 6].map((day) => <span key={day} style={{ gridRow: day + 1 }}>{dateLabel(`2024-01-0${day + 1}`, { weekday: 'short' })}</span>)}</div>
              <div className="habit-statistics-grid" role="group" aria-label={c.activity} aria-describedby={helpId}>
                {stats.days.map((day, index) => {
                  const level = day.completed ? Math.ceil(day.completed / day.total * 4) : 0
                  const label = `${dateLabel(day.date, { dateStyle: 'full' })}: ${day.total ? `${number(day.completed)} / ${number(day.total)} ${c.completed}` : c.noScheduled}`
                  return <button type="button" key={day.date} className="habit-statistics-cell" data-date={day.date} data-level={level} data-empty={!day.total} aria-label={label} title={label} aria-pressed={selection.date === day.date} aria-current={day.date === today ? 'date' : undefined} tabIndex={selection.date === day.date ? 0 : -1} style={{ gridColumn: Math.floor((index + offset) / 7) + 1, gridRow: (index + offset) % 7 + 1 }} onClick={() => setSelected(day.date)} onFocus={() => setSelected(day.date)} onKeyDown={(event) => moveDay(event, index)}>
                    {day.total > 0 && day.completed === day.total && <Check size={13} aria-hidden="true" />}
                  </button>
                })}
              </div>
            </div>
          </div>
          <p id={helpId} className="sr-only">{c.keyboardHelp}</p>
          <div className="habit-statistics-legend" aria-hidden="true"><span>{c.less}</span>{[0, 1, 2, 3, 4].map((level) => <i key={level} data-level={level} />)}<span>{c.more}</span></div>
          <div className="habit-statistics-selection" aria-live="polite" aria-atomic="true"><CalendarDays size={16} aria-hidden="true" /><time dateTime={selection.date}>{dateLabel(selection.date, { day: 'numeric', month: 'short', year: 'numeric' })}</time><span>{selection.total ? <><strong>{number(selection.completed)}</strong> / {number(selection.total)} {c.completed}</> : c.noScheduled}</span></div>
        </section>

        <section className="habit-statistics-ranking" aria-label={c.byHabit}>
          <div className="habit-statistics-subheading"><h3>{c.byHabit}</h3><span>{number(period)} {c.days}</span></div>
          <ul>{stats.ranking.slice(rankingStart, rankingStart + RANKING_PAGE_SIZE).map((habit) => <li key={habit.id}>
            <div className="habit-statistics-habit-title"><span>{habit.title}</span><strong>{percent(habit.rate)}</strong></div>
            <progress value={habit.completed} max={habit.total || 1} aria-label={habit.title} />
            <span className="habit-statistics-caption">{number(habit.completed)} / {number(habit.total)} {c.daysCompleted}</span>
          </li>)}</ul>
          {lastPage > 0 && <nav className="habit-statistics-pagination" aria-label={c.byHabit}>
            <span>{number(rankingStart + 1)}–{number(Math.min(rankingStart + RANKING_PAGE_SIZE, stats.ranking.length))} / {number(stats.ranking.length)}</span>
            <button type="button" className="habit-icon" aria-label={c.previousHabits} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={17} aria-hidden="true" /></button>
            <button type="button" className="habit-icon" aria-label={c.nextHabits} disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}><ChevronRight size={17} aria-hidden="true" /></button>
          </nav>}
        </section>
      </div>
      <p className="habit-statistics-note">{c.calculationHint}</p>
    </>}
  </section>
}

export function HabitStatisticsSkeleton() {
  return <div className="habit-statistics habit-statistics-skeleton">
    <div className="habit-statistics-heading">
      <div><span className="personal-skeleton-line habit-skeleton-heading" /><span className="personal-skeleton-line habit-statistics-skeleton-caption" /></div>
      <span className="personal-skeleton-line habit-statistics-skeleton-period" />
    </div>
    <div className="habit-statistics-summary">
      <div className="habit-statistics-rate">
        <span className="personal-skeleton-line habit-skeleton-label" />
        <span className="personal-skeleton-line habit-statistics-skeleton-value" />
        <span className="personal-skeleton-line habit-statistics-skeleton-meter" />
        <span className="personal-skeleton-line habit-statistics-skeleton-caption" />
      </div>
      <div className="habit-statistics-metrics">{[0, 1, 2].map((index) => <div key={index}>
        <span className="personal-skeleton-line habit-statistics-skeleton-caption" />
        <span className="personal-skeleton-line habit-statistics-skeleton-number" />
        <span className="personal-skeleton-line habit-statistics-skeleton-caption" />
      </div>)}</div>
    </div>
    <div className="habit-statistics-details">
      <div className="habit-statistics-calendar">
        <div className="habit-statistics-subheading"><span className="personal-skeleton-line habit-skeleton-heading" /></div>
        <div className="personal-skeleton-line habit-statistics-skeleton-calendar" />
        <div className="habit-statistics-selection"><span className="personal-skeleton-line habit-statistics-skeleton-caption" /></div>
      </div>
      <div className="habit-statistics-ranking">
        <div className="habit-statistics-subheading"><span className="personal-skeleton-line habit-skeleton-heading" /></div>
        <ul>{[0, 1, 2].map((index) => <li key={index}>
          <span className="personal-skeleton-line habit-skeleton-name" />
          <span className="personal-skeleton-line habit-statistics-skeleton-meter" />
          <span className="personal-skeleton-line habit-statistics-skeleton-caption" />
        </li>)}</ul>
      </div>
    </div>
    <div className="habit-statistics-note"><span className="personal-skeleton-line" /></div>
  </div>
}
