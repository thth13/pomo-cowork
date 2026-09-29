'use client'

import { Flame, Medal, Trophy, Zap } from 'lucide-react'
import type { StatisticsDetails } from '@/lib/statistics'
import { SectionHeading, useStatisticsCopy } from './shared'

export default function PersonalRecords({ details }: { details: StatisticsDetails }) {
  const { copy, duration, number, date } = useStatisticsCopy()
  const titles = { session: copy.longestSession, day: copy.bestDay, streak: copy.longestStreak, week: copy.bestWeek }
  const icons = { session: Trophy, day: Zap, streak: Flame, week: Medal }
  return <section className="insight-panel insight-records">
    <SectionHeading title={copy.records} caption={copy.recordsCaption} />
    <div className="insight-record-grid">{details.records.map((record) => { const Icon = icons[record.kind]; return <article key={record.kind} className="insight-record"><Icon size={24} strokeWidth={1.5} aria-hidden="true" /><span className="insight-label">{titles[record.kind]}</span><strong>{record.kind === 'streak' ? `${number(record.value)} ${copy.days}` : duration(record.value)}</strong><span className="insight-record-date">{record.date ? date(record.date, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>{record.isNew && <span className="insight-record-new">{copy.newRecord}</span>}</article> })}</div>
  </section>
}
