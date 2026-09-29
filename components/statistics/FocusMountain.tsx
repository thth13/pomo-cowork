'use client'

import { useId, useState } from 'react'
import type { StatisticsData, StatisticsDetails } from '@/lib/statistics'
import { Change, SectionHeading, useStatisticsCopy } from './shared'

// Horizontal Bezier handles stay inside each pair's bounds, so the skyline
// never implies negative focus or peaks higher than the observed endpoints.
function skyline(values: number[], maximum: number) {
  const points = values.map((value, i) => ({ x: 40 + i * 140, y: 228 - value / maximum * 180 }))
  const path = points.reduce((result, point, i) => {
    if (!i) return `M ${point.x} ${point.y}`
    const previous = points[i - 1]
    const middle = (previous.x + point.x) / 2
    return `${result} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`
  }, '')
  return { points, path }
}

export default function FocusMountain({ data, details }: { data: StatisticsData; details: StatisticsDetails }) {
  const { copy, duration, date } = useStatisticsCopy()
  const [selected, setSelected] = useState(Math.max(0, details.week.findIndex((day) => day.date === data.today)))
  const gradient = useId().replace(/:/g, '')
  const maximum = Math.max(60, ...details.week.map((day) => day.minutes), ...details.previousWeek.map((day) => day.minutes))
  const currentValues = details.week.filter((day) => day.date <= data.today).map((day) => day.minutes)
  const current = skyline(currentValues, maximum)
  const previous = skyline(details.previousWeek.map((day) => day.minutes), maximum)
  const active = details.week[selected]
  const lastX = current.points[current.points.length - 1].x
  return <section className="insight-panel insight-mountain">
    <SectionHeading title={copy.mountain} caption={copy.mountainCaption} aside={<div className="insight-chart-legend"><span><i />{copy.thisWeek}</span><span><i />{copy.lastWeek}</span></div>} />
    <div className="insight-mountain-top"><div><strong>{duration(data.summary.thisWeek.minutes)}</strong><Change current={data.summary.thisWeek.minutes} previous={data.summary.lastWeek.minutes} label /></div><div className="insight-mountain-readout" aria-live="polite"><span>{date(active.date, { weekday: 'long' })}</span><strong>{duration(active.minutes)}</strong></div></div>
    <div className="insight-mountain-chart">
      <svg viewBox="0 0 920 260" preserveAspectRatio="none" role="img" aria-label={details.week.map((day) => `${date(day.date, { weekday: 'long' })}: ${duration(day.minutes)}`).join(', ')}>
        <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--pixel-growth)" stopOpacity=".48" /><stop offset="100%" stopColor="var(--pixel-growth)" stopOpacity=".04" /></linearGradient></defs>
        {[48, 108, 168, 228].map((y) => <line key={y} x1="0" x2="920" y1={y} y2={y} className="insight-chart-grid" />)}
        <path d={`${previous.path} L 880 228 L 40 228 Z`} fill="var(--pixel-line)" opacity=".13" />
        <path d={previous.path} className="insight-mountain-previous" />
        <path d={`${current.path} L ${lastX} 228 L 40 228 Z`} fill={`url(#${gradient})`} />
        <path d={current.path} className="insight-mountain-line" />
        {current.points.map((point, i) => <g key={i}><line x1={point.x} x2={point.x} y1={point.y} y2="228" className="insight-mountain-guide" opacity={i === selected ? 1 : 0} /><circle cx={point.x} cy={point.y} r={i === selected ? 5 : 3} className="insight-mountain-point" /></g>)}
      </svg>
      <div className="insight-mountain-days">{details.week.map((day, i) => <button key={day.date} type="button" aria-pressed={i === selected} aria-label={`${date(day.date, { weekday: 'long' })}: ${duration(day.minutes)}`} onClick={() => setSelected(i)} onFocus={() => setSelected(i)}><span>{date(day.date, { weekday: 'short' })}</span><strong>{day.date > data.today ? '—' : duration(day.minutes)}</strong></button>)}</div>
    </div>
    {!data.summary.thisWeek.minutes && <p className="insight-footnote">{copy.noWeek}</p>}
  </section>
}
