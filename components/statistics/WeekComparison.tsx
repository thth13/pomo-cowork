'use client'

import type { StatisticsData } from '@/lib/statistics'
import { SectionHeading, useStatisticsCopy } from './shared'

export default function WeekComparison({ data }: { data: StatisticsData }) {
  const { copy, duration, number } = useStatisticsCopy()
  const { thisWeek, lastWeek } = data.summary
  const metrics = [
    { label: copy.focusTime, current: thisWeek.minutes, previous: lastWeek.minutes, format: duration },
    { label: copy.sessions, current: thisWeek.sessions, previous: lastWeek.sessions, format: number },
    { label: copy.averageSession, current: thisWeek.average, previous: lastWeek.average, format: duration },
    { label: copy.activeDays, current: thisWeek.activeDays, previous: lastWeek.activeDays, format: number },
  ]
  return <section className="insight-panel insight-comparison">
    <SectionHeading title={copy.comparison} caption={copy.comparisonCaption} />
    <div className="insight-comparison-head" aria-hidden="true"><span>{copy.lastWeek}</span><span>{copy.thisWeek}</span></div>
    <dl>{metrics.map(({ label, current, previous, format }) => <div className="insight-comparison-row" key={label}><dt>{label}</dt><dd><span className="sr-only">{copy.lastWeek}: </span><span>{format(previous)}</span><span aria-hidden="true">→</span><strong><span className="sr-only">{copy.thisWeek}: </span>{format(current)}</strong></dd><div className="insight-comparison-tracks" aria-hidden="true"><i style={{ width: `${previous / Math.max(1, current, previous) * 100}%` }} /><i style={{ width: `${current / Math.max(1, current, previous) * 100}%` }} /></div><span className={`insight-comparison-delta ${current >= previous ? 'is-up' : 'is-down'}`}><span className="sr-only">{copy.change}: </span>{current === previous ? '—' : `${current > previous ? '+' : '−'}${format(Math.abs(current - previous))}`}</span></div>)}</dl>
    <p className="insight-footnote">{copy.weekNote}</p>
  </section>
}
