'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Clock3 } from 'lucide-react'
import type { StatisticsData, FocusTimelineSession } from '@/lib/statistics'
import { SectionHeading, timeLabel, useStatisticsCopy } from './shared'

export default function DailyTimeline({ data, sessions }: { data: StatisticsData; sessions: FocusTimelineSession[] }) {
  const { copy, duration, date, locale } = useStatisticsCopy()
  const [selected, setSelected] = useState<string | null>(null)
  const active = sessions.find((session) => session.id === selected) ?? sessions[sessions.length - 1]
  const time = (value: string) => new Date(value).toLocaleTimeString(locale, { timeZone: data.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const firstHour = Math.max(0, Math.min(8, Math.floor(Math.min(...sessions.map((session) => session.startMinute)) / 60)))
  const lastHour = Math.min(24, Math.max(22, Math.ceil(Math.max(...sessions.map((session) => session.endMinute)) / 60)))
  const span = (lastHour - firstHour) * 60
  const laneEnds: number[] = []
  const positioned = sessions.map((session) => {
    let lane = laneEnds.findIndex((end) => end <= session.startMinute)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = Math.max(session.startMinute + 2, session.endMinute)
    return { ...session, lane }
  })
  const ticks = Array.from({ length: Math.floor((lastHour - firstHour) / 2) + 1 }, (_, i) => firstHour + i * 2)
  if (ticks[ticks.length - 1] !== lastHour) ticks.push(lastHour)
  return <section className="insight-panel insight-timeline">
    <SectionHeading title={copy.timeline} caption={copy.timelineCaption} aside={<span className="insight-tag">{copy.today} · {date(data.today)}</span>} />
    {sessions.length ? <>
      <div className="insight-timeline-scroll"><div className="insight-timeline-canvas"><div className="insight-timeline-ticks">{ticks.map((hour) => <span key={hour} style={{ left: `${(hour - firstHour) / (lastHour - firstHour) * 100}%` }}>{timeLabel(hour)}</span>)}</div><div className="insight-timeline-track" style={{ height: Math.max(1, laneEnds.length) * 48 + 16 }}>{positioned.map((session) => <button type="button" key={session.id} style={{ left: `${(session.startMinute - firstHour * 60) / span * 100}%`, width: `${Math.max(.4, (session.endMinute - session.startMinute) / span * 100)}%`, top: session.lane * 48 + 8 }} aria-label={`${time(session.start)}–${time(session.end)} · ${duration(session.minutes)} · ${session.task || copy.untitled}`} title={`${time(session.start)}–${time(session.end)} · ${duration(session.minutes)} · ${session.task || copy.untitled}`} aria-pressed={active?.id === session.id} onClick={() => setSelected(session.id)} onFocus={() => setSelected(session.id)} onMouseEnter={() => setSelected(session.id)} />)}</div></div></div>
      {active && <div className="insight-timeline-detail" aria-live="polite"><Clock3 size={17} aria-hidden="true" /><strong>{time(active.start)}–{time(active.end)}</strong><span>{duration(active.minutes)} {copy.focused}</span><span className="insight-timeline-task">{active.task || copy.untitled}</span></div>}
      <p className="insight-footnote">{copy.timelineNote}</p>
      <details className="insight-session-list"><summary>{copy.sessionList} ({sessions.length})</summary><ol>{sessions.map((session) => <li key={session.id}><button type="button" aria-pressed={active?.id === session.id} onClick={() => setSelected(session.id)}><span>{time(session.start)}–{time(session.end)}</span><span>{session.task || copy.untitled}</span><strong>{duration(session.minutes)}</strong></button></li>)}</ol></details>
    </> : <div className="insight-timeline-empty"><Clock3 size={26} aria-hidden="true" /><div><h3>{copy.noToday}</h3><p>{copy.noTodayBody}</p></div><Link href="/" className="insight-button">{copy.start}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>}
  </section>
}
