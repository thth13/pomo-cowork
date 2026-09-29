'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, LockKeyhole, RefreshCw, Sprout } from 'lucide-react'
import AuthModal from '@/components/AuthModal'
import { useStatistics } from '@/hooks/useStatistics'
import FocusHero from './FocusHero'
import FocusHeatmap from './FocusHeatmap'
import FocusDNA, { FocusScore } from './FocusDNA'
import FocusMountain from './FocusMountain'
import PersonalRecords from './PersonalRecords'
import WeekComparison from './WeekComparison'
import ProjectsGalaxy from './ProjectsGalaxy'
import DailyTimeline from './DailyTimeline'
import { useStatisticsCopy } from './shared'

export default function StatisticsDashboard() {
  const { copy, language, locale, duration, number } = useStatisticsCopy()
  const { data, error, loading, refreshing, signedIn, retry } = useStatistics()
  const [showAuth, setShowAuth] = useState(false)
  useEffect(() => { document.title = `${copy.eyebrow} | Pomo Cowork` }, [copy.eyebrow])
  useEffect(() => { if (signedIn && !error) setShowAuth(false) }, [signedIn, error])
  const expired = error?.status === 401
  const details = data?.details
  return <main className="insights" lang={language} data-i18n-ignore>
    <div className="insight-topline"><Link href="/" className="insight-text-link"><ArrowLeft size={15} aria-hidden="true" />{copy.timer}</Link><Link href="/stats" className="insight-text-link">{copy.classic}<ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    <header className="insight-intro"><div><p className="insight-eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.subtitle}</p></div><span className="insight-intro-mark" aria-hidden="true"><Sprout size={34} strokeWidth={1.25} /></span></header>
    {loading ? <div className="insight-state" role="status"><span className="insight-loader" /><p>{copy.loading}</p></div>
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
    <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
  </main>
}
