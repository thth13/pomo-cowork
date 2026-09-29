'use client'

import { Moon, Sunrise, Sun, Sunset } from 'lucide-react'
import type { StatisticsDetails, StatisticsData } from '@/lib/statistics'
import { SectionHeading, timeLabel, useStatisticsCopy } from './shared'

export function FocusScore({ data }: { data: StatisticsData }) {
  const { copy, number } = useStatisticsCopy()
  const score = data.summary.thisWeek.score
  const difference = score - data.summary.lastWeek.score
  return <section className="insight-panel insight-score">
    <SectionHeading title={copy.focusScore} />
    <div className="insight-score-gauge">
      <svg viewBox="0 0 200 200" aria-hidden="true">{Array.from({ length: 40 }, (_, i) => <rect key={i} x="96" y="9" width="8" height="18" rx="1" transform={`rotate(${i * 9} 100 100)`} className={i < Math.round(score * .4) ? 'is-filled' : ''} />)}</svg>
      <div><strong>{score}</strong><span>/ 100</span></div>
    </div>
    <h3>{score >= 80 ? copy.excellent : score >= 50 ? copy.steady : score > 0 ? copy.starting : copy.noScore}</h3>
    <p className={`insight-score-delta ${difference >= 0 ? 'is-up' : 'is-down'}`}>{difference > 0 ? '+' : ''}{number(difference)} {copy.points}</p>
    <details className="insight-explanation"><summary>{copy.scoreMethod}</summary><p>{copy.scoreFormula}</p></details>
  </section>
}

export default function FocusDNA({ details }: { details: StatisticsDetails }) {
  const { copy, duration, date } = useStatisticsCopy()
  const { dna } = details
  const total = dna.periods.reduce((sum, minutes) => sum + minutes, 0)
  const labels = [copy.morning, copy.afternoon, copy.evening, copy.night]
  const icons = [Sunrise, Sun, Sunset, Moon]
  const colors = ['var(--pixel-growth)', 'var(--pixel-accent)', 'var(--pixel-muted)', 'var(--pixel-line)']
  let offset = 0
  const dominant = dna.periods.indexOf(Math.max(...dna.periods))
  return <section className="insight-panel insight-dna">
    <SectionHeading title={copy.dna} caption={copy.dnaCaption} aside={<span className="insight-tag">{copy.allTime}</span>} />
    <div className="insight-dna-body"><div className="insight-dna-donut">
      <svg viewBox="0 0 200 200" role="img" aria-label={labels.map((label, i) => `${label}: ${total ? Math.round(dna.periods[i] / total * 100) : 0}%`).join(', ')}>
        {dna.periods.map((minutes, i) => { const share = total ? minutes / total * 100 : 0; const start = offset; offset += share; return <circle key={i} cx="100" cy="100" r="78" fill="none" stroke={colors[i]} strokeWidth="23" pathLength="100" strokeDasharray={`${Math.max(0, share - (share ? 1.5 : 0))} ${100 - Math.max(0, share - (share ? 1.5 : 0))}`} strokeDashoffset={-start} transform="rotate(-90 100 100)" /> })}
      </svg><div><Sun size={23} aria-hidden="true" /><strong>{labels[dominant]}</strong><span>{total ? Math.round(dna.periods[dominant] / total * 100) : 0}%</span></div>
    </div><div className="insight-dna-legend">{labels.map((label, i) => { const Icon = icons[i]; return <div key={label}><span className="insight-color-mark" style={{ background: colors[i] }} /><Icon size={16} aria-hidden="true" /><span>{label}</span><strong>{total ? Math.round(dna.periods[i] / total * 100) : 0}%</strong></div> })}</div></div>
    <dl className="insight-dna-facts">{[
      [copy.peak, dna.peakHour === null ? '—' : `${timeLabel(dna.peakHour)}–${timeLabel((dna.peakHour + 2) % 24)}`],
      [copy.averageSession, duration(dna.averageSession)],
      [copy.averageBreak, dna.averageBreak === null ? copy.noBreaks : duration(dna.averageBreak)],
      [copy.bestWeekday, dna.bestWeekday === null ? '—' : date(`2024-01-0${dna.bestWeekday + 1}`, { weekday: 'long' })],
    ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p className="insight-footnote">{copy.dnaMethod}</p>
  </section>
}
