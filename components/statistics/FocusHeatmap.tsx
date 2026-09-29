'use client'

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { CalendarDays } from 'lucide-react'
import type { StatisticsData, StatisticsDetails } from '@/lib/statistics'
import { SectionHeading, useStatisticsCopy } from './shared'

export default function FocusHeatmap({ data, details }: { data: StatisticsData; details: StatisticsDetails }) {
  const { copy, date, duration, number } = useStatisticsCopy()
  const [months, setMonths] = useState(12)
  const [selected, setSelected] = useState(data.today)
  const grid = useRef<HTMLDivElement>(null)
  const helpId = useId()
  useEffect(() => {
    if (grid.current) grid.current.scrollLeft = grid.current.scrollWidth
  }, [months])
  const days = details.days.slice(-Math.round(months * 365 / 12))
  const offset = (new Date(`${days[0].date}T12:00:00Z`).getUTCDay() + 6) % 7
  const columns = Math.ceil((days.length + offset) / 7)
  const active = days.find((day) => day.date === selected) ?? days[days.length - 1]
  const maximum = Math.max(1, ...days.map((day) => day.minutes))
  const markers = days.flatMap((day, index) => day.date.endsWith('-01') || index === 0 ? [{ label: date(day.date, { month: 'short' }), column: Math.floor((index + offset) / 7) + 1 }] : [])
    .filter((marker, i, list) => i === 0 || marker.column - list[i - 1].column >= 3)
  const handleKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const moves: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }
    if (!(event.key in moves) && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? days.length - 1 : Math.max(0, Math.min(days.length - 1, index + moves[event.key]))
    setSelected(days[target].date)
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${days[target].date}"]`)?.focus()
  }
  return <section className="insight-panel insight-map">
    <SectionHeading title={copy.map} caption={copy.mapCaption} aside={<div className="insight-segments" aria-label={copy.months}>{[3, 6, 12].map((value) => <button key={value} type="button" aria-pressed={value === months} onClick={() => setMonths(value)}>{value}<span> {copy.months}</span></button>)}</div>} />
    <div className="insight-map-scroll" ref={grid}>
      <div className="insight-map-canvas" style={{ '--map-columns': columns } as CSSProperties}>
        <div className="insight-map-months" aria-hidden="true">{markers.map((marker, i) => <span key={i} style={{ gridColumn: marker.column }}>{marker.label}</span>)}</div>
        <div className="insight-map-weekdays" aria-hidden="true">{[0, 2, 4].map((day) => <span key={day} style={{ gridRow: day + 1 }}>{date(`2024-01-0${day + 1}`, { weekday: 'short' })}</span>)}</div>
        <div className="insight-map-grid" role="group" aria-label={copy.map} aria-describedby={helpId}>
          {days.map((day, i) => {
            const level = day.minutes ? Math.min(4, Math.ceil(day.minutes / maximum * 4)) : 0
            const label = `${date(day.date, { dateStyle: 'full' })} · ${duration(day.minutes)} ${copy.focused} · ${number(day.sessions)} ${copy.sessions}`
            return <button key={day.date} type="button" data-date={day.date} data-level={level} aria-label={label} title={label} aria-pressed={active.date === day.date} tabIndex={active.date === day.date ? 0 : -1} style={{ gridColumn: Math.floor((i + offset) / 7) + 1, gridRow: (i + offset) % 7 + 1 }} onClick={() => setSelected(day.date)} onFocus={() => setSelected(day.date)} onKeyDown={(event) => handleKey(event, i)} />
          })}
        </div>
      </div>
    </div>
    <div className="insight-map-bottom"><div className="insight-map-selection" aria-live="polite"><CalendarDays size={15} aria-hidden="true" /><strong>{date(active.date)}</strong><span>{duration(active.minutes)} {copy.focused}</span><span>· {number(active.sessions)} {copy.sessions}</span></div><div className="insight-map-legend"><span>{copy.less}</span>{[0, 1, 2, 3, 4].map((level) => <i key={level} data-level={level} />)}<span>{copy.more}</span></div></div>
    <p id={helpId} className="sr-only">{copy.mapHelp}</p>
    <div className="insight-map-summary">{[
      [copy.bestDay, duration(details.records.find((record) => record.kind === 'day')?.value ?? 0)],
      [copy.sessionsMonth, number(details.month.sessions)], [copy.focusMonth, duration(details.month.minutes)],
    ].map(([label, value]) => <div key={label}><span className="insight-label">{label}</span><strong>{value}</strong></div>)}</div>
  </section>
}
