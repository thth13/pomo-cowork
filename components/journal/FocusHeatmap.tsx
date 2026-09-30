'use client'
import { useState } from 'react'
import { duration } from '@/lib/journal/types'
export default function FocusHeatmap({
  days
}: {
  days: {
    date: string;
    seconds: number;
    sessions: number;
  }[];
}) {
  const [active, setActive] = useState<string | null>(null)
  const map = new Map(days.map(day => [day.date, day]))
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setUTCDate(start.getUTCDate() - 364)
  const dates = Array.from({
    length: 365
  }, (_, i) => {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + i)
    return date.toISOString().slice(0, 10)
  })
  return <section className="journal-card">
    <h2>Focus activity</h2>
    <p className="journal-muted">Completed focus sessions · last 365 days · UTC</p>
    <div className="journal-heatmap-scroll" tabIndex={0} aria-label="Year of focus activity, scroll horizontally">
      <div className="journal-heatmap" role="list">
        {Array.from({
          length: start.getUTCDay()
        }, (_, i) => <span key={`pad${i}`} aria-hidden="true" />)}
        {dates.map(date => {
          const day = map.get(date),
            seconds = day?.seconds || 0,
            level = seconds >= 14400 ? 4 : seconds >= 7200 ? 3 : seconds >= 1800 ? 2 : seconds > 0 ? 1 : 0
          const label = `${date}: ${duration(seconds)} focused, ${day?.sessions || 0} sessions`
          return <span role="listitem" tabIndex={0} key={date} data-level={level} aria-label={label} className="journal-heat-day" onMouseEnter={() => setActive(date)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(date)} onBlur={() => setActive(null)} onKeyDown={event => { if (event.key === 'Escape') setActive(null) }}>{active === date && <span className="journal-heat-tooltip" role="tooltip">{label}</span>}</span>
        })}
      </div>
    </div>
    <p className="journal-muted">
      Less
      <span className="journal-heat-legend" aria-hidden="true">{[0, 1, 2, 3, 4].map(level => <i key={level} data-level={level} />)}</span>
      {' '}
      More
    </p>
  </section>
}
