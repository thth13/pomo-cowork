'use client'

import { Flame, Sprout, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { ranksCopy } from '@/lib/i18n/ranks'
import type { StatisticsData } from '@/lib/statistics'
import { Change, useStatisticsCopy } from './shared'

export default function FocusHero({ data }: { data: StatisticsData }) {
  const { copy, language, number, date } = useStatisticsCopy()
  const { thisWeek, lastWeek, currentStreak, rank } = data.summary
  const hours = Math.floor(thisWeek.minutes / 60)
  const minutes = thisWeek.minutes % 60
  return <section className="insight-hero" aria-label={copy.weeklyFocus}>
    <div className="insight-hero-main">
      <div className="insight-eyebrow"><span className="insight-live-dot" />{copy.weeklyFocus}<span className="insight-hero-date">{date(data.weekStart)} — {date(data.today)}</span></div>
      <div className="insight-hero-number" aria-label={`${number(hours)} h ${minutes} min`}><span>{number(hours)}</span><small>h</small><span>{String(minutes).padStart(2, '0')}</span><small>m</small></div>
      <Change current={thisWeek.minutes} previous={lastWeek.minutes} label />
      <p className="insight-hero-note">{copy.weekNote}</p>
    </div>
    <div className="insight-hero-progress">
      <div className="insight-streak"><Flame size={23} aria-hidden="true" /><strong>{number(currentStreak)}</strong><span>{copy.streak}</span></div>
      <Link href="/ranks" className="insight-rank-heading insight-rank-link" aria-label={`${copy.ranks[rank.rank.id]} · ${ranksCopy[language].link}`}><Sprout size={30} strokeWidth={1.5} aria-hidden="true" /><div><span className="insight-label">{copy.rank}</span><h2>{copy.ranks[rank.rank.id]}</h2></div><ArrowUpRight size={22} aria-hidden="true" /></Link>
      <div className="insight-rank-values"><strong>{number(rank.current)} <span>/ {number(rank.required)} XP</span></strong><span>{rank.percent}%</span></div>
      <progress className="insight-progress" max={100} value={rank.percent} aria-label={copy.rank} />
      <p className="insight-label">{rank.nextRank ? `${copy.nextRank} · ${copy.ranks[rank.nextRank.id]}` : copy.highestRank}</p>
    </div>
  </section>
}
