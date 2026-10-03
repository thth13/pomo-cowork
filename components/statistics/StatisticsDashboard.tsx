'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, LockKeyhole, RefreshCw, Sprout } from 'lucide-react'
import AuthModal from '@/components/AuthModal'
import { useStatistics } from '@/hooks/useStatistics'
import { ranksCopy } from '@/lib/i18n/ranks'
import FocusHero from './FocusHero'
import MonthlyRecaps from '@/components/wrapped/MonthlyRecaps'
import FocusHeatmap from './FocusHeatmap'
import FocusDNA, { FocusScore } from './FocusDNA'
import FocusMountain from './FocusMountain'
import PersonalRecords from './PersonalRecords'
import WeekComparison from './WeekComparison'
import ProjectsGalaxy from './ProjectsGalaxy'
import DailyTimeline from './DailyTimeline'
import { useStatisticsCopy } from './shared'
import PersonalNavigation from '@/components/PersonalNavigation'
import PersonalPageSkeleton from '@/components/PersonalPageSkeleton'

export default function StatisticsDashboard() {
  const { copy, language, locale, duration, number } = useStatisticsCopy()
  const { data, error, loading, refreshing, signedIn, retry } = useStatistics()
  const [showAuth, setShowAuth] = useState(false)
  useEffect(() => { document.title = `${copy.eyebrow} | Pomo Cowork` }, [copy.eyebrow])
  useEffect(() => { if (signedIn && !error) setShowAuth(false) }, [signedIn, error])
  const expired = error?.status === 401
  const details = data?.details
  return <main className="insights personal-page-frame" lang={language} data-i18n-ignore>
    <PersonalNavigation />
    <MonthlyRecaps />
    {loading ? <PersonalPageSkeleton variant="statistics" />
      : !signedIn || expired ? <div className="insight-state"><Sprout size={42} strokeWidth={1.3} aria-hidden="true" /><h2>{expired ? copy.expired : copy.signInTitle}</h2><p>{copy.signInBody}</p><button type="button" className="insight-button insight-button-primary" onClick={() => setShowAuth(true)}>{copy.signIn}<ArrowUpRight size={16} aria-hidden="true" /></button></div>
      : error && !data ? <div className="insight-state" role="alert"><h2>{copy.error}</h2><p>{copy.errorBody}</p><button type="button" className="insight-button" onClick={retry}>{copy.retry}<RefreshCw size={16} aria-hidden="true" /></button></div>
      : data && !data.summary.totalSessions ? <div className="insight-state insight-empty"><Sprout size={52} strokeWidth={1.2} aria-hidden="true" /><h2>{copy.empty}</h2><p>{copy.emptyBody}</p><Link href="/" className="insight-button insight-button-primary">{copy.start}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
      : data ? <>
        {error && <div className="insight-refresh-error" role="status">{copy.refreshingError}<button type="button" className="insight-text-link" onClick={retry}>{copy.retry}</button></div>}
        <FocusHero data={data} />
        {details ? <div className="insight-sections">
          <FocusHeatmap data={data} details={details} />
          <div className="insight-rhythm-row"><FocusScore data={data} /><FocusDNA details={details} /></div>
          <FocusMountain data={data} details={details} />
          <div className="insight-records-row"><PersonalRecords details={details} /><WeekComparison data={data} /></div>
          <ProjectsGalaxy projects={details.projects} />
          <DailyTimeline data={data} sessions={details.timeline} />
        </div> : <section className="insight-pro"><LockKeyhole size={28} strokeWidth={1.5} aria-hidden="true" /><div><h2>{copy.proTitle}</h2><p>{copy.proBody}</p></div><Link href="/pricing" className="insight-button insight-button-primary">{copy.proAction}<ArrowUpRight size={16} aria-hidden="true" /></Link></section>}
        <footer className="insight-footer"><div><span>{copy.totalFocus}: <strong>{duration(data.summary.totalMinutes)}</strong></span><span>{copy.completed}: <strong>{number(data.summary.completedSessions)}</strong></span></div><div><span>{copy.timezone}: {data.timezone} · {copy.updated} {new Date(data.generatedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span><button type="button" className="insight-refresh" onClick={retry} disabled={refreshing} aria-label={copy.refresh} title={copy.refresh}><RefreshCw size={15} className={refreshing ? 'insight-spinning' : ''} aria-hidden="true" /></button></div></footer>
      </> : null}
    <div className="insight-resource-links"><Link href="/ranks" className="insight-text-link">{ranksCopy[language].link}<ArrowUpRight size={15} aria-hidden="true" /></Link><Link href="/stats" className="insight-text-link">{copy.classic}<ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
  </main>
}
