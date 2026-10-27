'use client'

import type { CSSProperties } from 'react'
import { useI18n } from '@/components/I18nProvider'

function Placeholder({ width = '100%', height = 13, className = '' }: { width?: CSSProperties['width']; height?: CSSProperties['height']; className?: string }) {
  return <span className={`personal-skeleton-line ${className}`} style={{ width, height, maxWidth: '100%' }} />
}

function Heading({ controls = false }: { controls?: boolean }) {
  return <div className="insight-section-heading">
    <div className="insight-skeleton-heading"><Placeholder width={190} height={27} /><Placeholder width={260} height={20} /></div>
    {controls && <Placeholder width={180} height={46} />}
  </div>
}

export default function StatisticsSkeleton() {
  const { t } = useI18n()
  return <div role="status" aria-label={t.common.loading}>
    <div className="insight-skeleton" aria-hidden="true">
      <div className="insight-hero">
        <div className="insight-hero-main">
          <div className="insight-eyebrow"><Placeholder width={180} height={17} /><div className="insight-hero-date"><Placeholder width={140} height={17} /></div></div>
          <div className="insight-hero-number"><Placeholder width="75%" height="1em" /></div>
          <Placeholder width={220} height={18} />
          <div className="insight-hero-note"><Placeholder width="85%" height={19} /></div>
          <div className="insight-footnote"><Placeholder width={170} height={19} /></div>
        </div>
        <div className="insight-hero-progress">
          <div className="insight-streak"><Placeholder width={26} height={26} /><Placeholder width={120} /></div>
          <div className="insight-rank-heading"><div className="insight-skeleton-heading"><Placeholder width={75} /><Placeholder width={150} height={31} /></div></div>
          <div className="insight-rank-values"><Placeholder width={110} height={18} /></div>
          <Placeholder height={8} className="insight-progress" />
          <Placeholder width={140} height={18} />
        </div>
      </div>

      <div className="insight-sections">
        <div className="insight-panel insight-map">
          <Heading controls />
          <div className="insight-map-scroll">
            <div className="insight-map-canvas" style={{ '--map-columns': 53 } as CSSProperties}>
              <div className="insight-map-months">{Array.from({ length: 12 }, (_, i) => <Placeholder key={i} width={24} height={10} className="insight-skeleton-month" />)}</div>
              <div className="insight-map-weekdays">{Array.from({ length: 7 }, (_, i) => <Placeholder key={i} width={24} height={9} />)}</div>
              <div className="insight-map-grid">{Array.from({ length: 371 }, (_, i) => <Placeholder key={i} height="auto" className="insight-skeleton-day" />)}</div>
            </div>
          </div>
          <div className="insight-map-bottom"><div className="insight-map-selection"><Placeholder width={240} /></div><Placeholder width={120} height={11} /></div>
          <div className="insight-map-summary">{Array.from({ length: 3 }, (_, i) => <div key={i} className="insight-skeleton-heading"><Placeholder width={110} height={18} /><Placeholder width={75} height={40} /></div>)}</div>
        </div>

        <div className="insight-rhythm-row">
          <div className="insight-panel insight-score">
            <div className="insight-section-heading"><Placeholder width={150} height={27} /></div>
            <div className="insight-score-gauge"><Placeholder height="100%" className="insight-skeleton-ring" /></div>
            <h3><Placeholder width="70%" height={25} className="insight-skeleton-centered" /></h3>
            <div className="insight-score-delta"><Placeholder width="50%" height={17} className="insight-skeleton-centered" /></div>
            <div className="insight-explanation"><Placeholder width="60%" height={40} className="insight-skeleton-centered" /></div>
          </div>
          <div className="insight-panel insight-dna">
            <Heading />
            <div className="insight-dna-body">
              <div className="insight-dna-donut"><Placeholder height="auto" className="insight-skeleton-ring" /></div>
              <div className="insight-dna-legend">{Array.from({ length: 4 }, (_, i) => <div key={i}><Placeholder height={20} /></div>)}</div>
            </div>
            <div className="insight-dna-facts">{Array.from({ length: 4 }, (_, i) => <div key={i} className="insight-skeleton-heading"><Placeholder width="70%" /><Placeholder width="85%" height={20} /></div>)}</div>
            <div className="insight-footnote"><Placeholder width="80%" /></div>
          </div>
        </div>

        <div className="insight-panel insight-mountain">
          <Heading />
          <div className="insight-mountain-top"><div className="insight-skeleton-heading"><Placeholder width={170} height={40} /><Placeholder width={200} height={18} /></div><Placeholder width={90} height={40} /></div>
          <Placeholder className="insight-skeleton-chart" height="var(--insight-skeleton-chart-height, 240px)" />
          <div className="insight-mountain-days">{Array.from({ length: 7 }, (_, i) => <div key={i} className="insight-skeleton-weekday"><Placeholder width="65%" /><Placeholder width="80%" /></div>)}</div>
        </div>

        <div className="insight-records-row">
          <div className="insight-panel insight-records">
            <Heading />
            <div className="insight-record-grid">{Array.from({ length: 4 }, (_, i) => <div key={i} className="insight-record insight-skeleton-heading"><Placeholder width={24} height={24} /><Placeholder width="80%" height={18} /><Placeholder width="65%" height={40} /><Placeholder width="75%" height={15} /></div>)}</div>
          </div>
          <div className="insight-panel insight-comparison">
            <Heading />
            <div className="insight-comparison-head"><Placeholder width={130} height={14} /></div>
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="insight-comparison-row"><Placeholder width="75%" height={17} /><Placeholder width={100} height={17} /><Placeholder height={12} /><Placeholder width={40} height={12} /></div>)}
            <div className="insight-footnote"><Placeholder width="85%" /></div>
          </div>
        </div>

        <div className="insight-panel insight-galaxy">
          <Heading />
          <div className="insight-galaxy-layout">
            <div className="insight-galaxy-space insight-skeleton-galaxy"><Placeholder width={160} height={160} className="insight-skeleton-ring" /><Placeholder width={100} height={100} className="insight-skeleton-ring" /></div>
            <div className="insight-galaxy-list">{Array.from({ length: 5 }, (_, i) => <div key={i} className="insight-skeleton-project"><Placeholder width="65%" height={33} /><Placeholder width="20%" height={33} /></div>)}</div>
          </div>
          <div className="insight-galaxy-detail"><Placeholder width="70%" height={18} /></div>
        </div>

        <div className="insight-panel insight-timeline">
          <Heading />
          <div className="insight-timeline-scroll"><div className="insight-timeline-canvas"><Placeholder height={20} /><div className="insight-skeleton-project"><Placeholder width="25%" height={32} /><Placeholder width="40%" height={32} /><Placeholder width="15%" height={32} /></div></div></div>
          <div className="insight-timeline-detail"><Placeholder width="65%" height={18} /></div>
          <div className="insight-footnote"><Placeholder width="80%" /></div>
        </div>
      </div>
      <div className="insight-footer"><Placeholder width={280} /><Placeholder width={260} height={44} /></div>
    </div>
  </div>
}
