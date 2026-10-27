'use client'

import Link from 'next/link'
import { ArrowUpRight, Clock3, Hourglass, Layers3 } from 'lucide-react'
import type { StatisticsData } from '@/lib/statistics'
import { SectionHeading, useStatisticsCopy } from './shared'

export default function SessionOverview({ data }: { data: StatisticsData }) {
  const { copy, duration, number } = useStatisticsCopy()
  const { totalMinutes, totalSessions } = data.summary
  const metrics = [
    { label: copy.totalFocus, value: duration(totalMinutes), icon: Clock3 },
    { label: copy.totalWorkSessions, value: number(totalSessions), icon: Layers3 },
    { label: copy.averageSession, value: totalSessions ? duration(totalMinutes / totalSessions) : '—', icon: Hourglass },
  ]

  return <section className="insight-panel insight-session-overview" aria-label={copy.sessionOverview}>
    <SectionHeading title={copy.sessionOverview} aside={<span className="insight-label">{copy.allTime}</span>} />
    <dl className="insight-session-metrics">
      {metrics.map(({ label, value, icon: Icon }) => <div key={label}><dt><Icon size={15} strokeWidth={1.5} aria-hidden="true" /><span>{label}</span></dt><dd>{value}</dd></div>)}
    </dl>
    {totalSessions ? <p className="insight-footnote">{copy.sessionOverviewNote}</p>
      : <div className="insight-session-empty"><p>{copy.emptyBody}</p><Link href="/" className="insight-text-link">{copy.start}<ArrowUpRight size={15} aria-hidden="true" /></Link></div>}
  </section>
}
