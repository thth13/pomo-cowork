'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUpRight, LockKeyhole, RefreshCw, Sprout } from 'lucide-react'
import AuthModal from '@/components/AuthModal'
import { PaywallModal } from '@/components/PaywallModal'
import { useStatistics } from '@/hooks/useStatistics'
import { ranksCopy } from '@/lib/i18n/ranks'
import FocusHero from './FocusHero'
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
import type { StatisticsData, StatisticsDetails } from '@/lib/statistics'
import { createStatisticsPreview } from './preview'

function StatisticsPreviewCard({ children, locked }: { children: ReactNode; locked: boolean }) {
  if (!locked) return children
  return <div className="insight-locked-card">
    <div className="insight-preview-data" aria-hidden="true" ref={(element) => { element?.setAttribute('inert', '') }}>{children}</div>
  </div>
}

function StatisticsSections({ data, details, locked = false }: { data: StatisticsData; details: StatisticsDetails; locked?: boolean }) {
  return <div className="insight-sections">
    <StatisticsPreviewCard locked={locked}><FocusHeatmap data={data} details={details} /></StatisticsPreviewCard>
    <div className="insight-rhythm-row">
      <StatisticsPreviewCard locked={locked}><FocusScore data={data} /></StatisticsPreviewCard>
      <StatisticsPreviewCard locked={locked}><FocusDNA details={details} /></StatisticsPreviewCard>
    </div>
    <StatisticsPreviewCard locked={locked}><FocusMountain data={data} details={details} /></StatisticsPreviewCard>
    <div className="insight-records-row">
      <StatisticsPreviewCard locked={locked}><PersonalRecords details={details} /></StatisticsPreviewCard>
      <StatisticsPreviewCard locked={locked}><WeekComparison data={data} /></StatisticsPreviewCard>
    </div>
    <StatisticsPreviewCard locked={locked}><ProjectsGalaxy projects={details.projects} /></StatisticsPreviewCard>
    <StatisticsPreviewCard locked={locked}><DailyTimeline data={data} sessions={details.timeline} /></StatisticsPreviewCard>
  </div>
}

export default function StatisticsDashboard() {
  const { copy, language, locale, duration, number } = useStatisticsCopy()
  const { data, error, loading, refreshing, signedIn, retry } = useStatistics()
  const [showAuth, setShowAuth] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  useEffect(() => { document.title = `${copy.eyebrow} | Pomo Cowork` }, [copy.eyebrow])
  useEffect(() => { if (signedIn && !error) setShowAuth(false) }, [signedIn, error])
  const expired = error?.status === 401
  const details = data?.details
  const preview = useMemo(() => data && !data.details ? createStatisticsPreview(data, copy.previewTasks) : null, [data, copy.previewTasks])
  return <main className="insights personal-page-frame" lang={language} data-i18n-ignore>
    <PersonalNavigation />
    {loading ? <PersonalPageSkeleton variant="statistics" />
      : !signedIn || expired ? <div className="insight-state"><Sprout size={42} strokeWidth={1.3} aria-hidden="true" /><h2>{expired ? copy.expired : copy.signInTitle}</h2><p>{copy.signInBody}</p><button type="button" className="insight-button insight-button-primary" onClick={() => setShowAuth(true)}>{copy.signIn}<ArrowUpRight size={16} aria-hidden="true" /></button></div>
      : error && !data ? <div className="insight-state" role="alert"><h2>{copy.error}</h2><p>{copy.errorBody}</p><button type="button" className="insight-button" onClick={retry}>{copy.retry}<RefreshCw size={16} aria-hidden="true" /></button></div>
      : data && details && !data.summary.totalSessions ? <div className="insight-state insight-empty"><Sprout size={52} strokeWidth={1.2} aria-hidden="true" /><h2>{copy.empty}</h2><p>{copy.emptyBody}</p><Link href="/" className="insight-button insight-button-primary">{copy.start}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
      : data ? <>
        {error && <div className="insight-refresh-error" role="status">{copy.refreshingError}<button type="button" className="insight-text-link" onClick={retry}>{copy.retry}</button></div>}
        <FocusHero data={data} />
        {details ? <StatisticsSections data={data} details={details} /> : preview?.details ? <div className="insight-locked-preview">
          <StatisticsSections data={preview} details={preview.details} locked />
          <div className="insight-preview-overlay">
            <section className="insight-pro insight-pro-overlay" aria-labelledby="statistics-pro-title">
              <LockKeyhole size={28} strokeWidth={1.5} aria-hidden="true" />
              <div><h2 id="statistics-pro-title">{copy.proTitle}</h2><p>{copy.proBody}</p></div>
              <button type="button" className="insight-button insight-button-primary" onClick={() => setShowPaywall(true)}>{copy.proAction}<ArrowUpRight size={16} aria-hidden="true" /></button>
            </section>
          </div>
        </div> : null}
        <footer className="insight-footer"><div><span>{copy.totalFocus}: <strong>{duration(data.summary.totalMinutes)}</strong></span><span>{copy.completed}: <strong>{number(data.summary.completedSessions)}</strong></span></div><div><span>{copy.timezone}: {data.timezone} · {copy.updated} {new Date(data.generatedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span><button type="button" className="insight-refresh" onClick={retry} disabled={refreshing} aria-label={copy.refresh} title={copy.refresh}><RefreshCw size={15} className={refreshing ? 'insight-spinning' : ''} aria-hidden="true" /></button></div></footer>
      </> : null}
    <div className="insight-resource-links"><Link href="/ranks" className="insight-text-link">{ranksCopy[language].link}<ArrowUpRight size={15} aria-hidden="true" /></Link><Link href="/stats" className="insight-text-link">{copy.classic}<ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
  </main>
}
