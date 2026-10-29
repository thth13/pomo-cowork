'use client'

import { useI18n } from '@/components/I18nProvider'

function PeopleSkeleton({ contribution = false }: { contribution?: boolean }) {
  return <>{Array.from({ length: 3 }, (_, index) => (
    <div className="community-person" key={index}>
      <span className="personal-skeleton-line room-skeleton-avatar" />
      <div className="community-person-copy room-skeleton-person-copy">
        <span className="personal-skeleton-line room-skeleton-name" />
        <span className="personal-skeleton-line room-skeleton-caption" />
        {contribution && <span className="personal-skeleton-line room-skeleton-meter" />}
      </div>
      {contribution && <span className="personal-skeleton-line room-skeleton-time" />}
    </div>
  ))}</>
}

export default function RoomPageSkeleton() {
  const { t } = useI18n()

  return (
    <div className="room-page-skeleton" role="status" aria-label={t.common.loading} aria-busy="true">
      <div aria-hidden="true">
        <div className="room-detail-header">
          <div className="community-intro">
            <div className="room-skeleton-identity">
              <div className="community-eyebrow"><span className="personal-skeleton-line room-skeleton-eyebrow" /></div>
              <div className="room-skeleton-title-row"><span className="personal-skeleton-line room-skeleton-title" /></div>
              <div className="community-actions mt-3">
                <span className="personal-skeleton-line room-skeleton-badge" />
                <span className="personal-skeleton-line room-skeleton-badge room-skeleton-participants" />
              </div>
            </div>
            <div className="community-actions">
              <span className="personal-skeleton-line room-skeleton-action" />
              <span className="personal-skeleton-line room-skeleton-action" />
            </div>
          </div>
        </div>
        <div className="community-metrics">
          {Array.from({ length: 3 }, (_, index) => <div className="community-metric" key={index}>
            <span><span className="personal-skeleton-line room-skeleton-metric-label" /></span>
            <strong><span className="personal-skeleton-line room-skeleton-metric-value" /></strong>
          </div>)}
        </div>
        <div className="community-columns">
          <div className="community-panel">
            <div className="community-panel-heading">
              <span className="personal-skeleton-line room-skeleton-panel-title" />
              <span className="personal-skeleton-line room-skeleton-count" />
            </div>
            <PeopleSkeleton />
          </div>
          <div className="community-stack">
            <div className="community-panel">
              <div className="community-panel-heading">
                <div className="room-skeleton-panel-copy">
                  <span className="personal-skeleton-line room-skeleton-panel-title" />
                  <span className="personal-skeleton-line room-skeleton-hint" />
                </div>
              </div>
              <PeopleSkeleton contribution />
            </div>
            <div className="community-panel">
              <div className="community-panel-heading">
                <div className="room-skeleton-panel-copy">
                  <span className="personal-skeleton-line room-skeleton-panel-title" />
                  <span className="personal-skeleton-line room-skeleton-hint" />
                </div>
              </div>
              <div className="community-chart room-skeleton-chart">
                <span className="personal-skeleton-line room-skeleton-chart-area" />
                <div className="room-skeleton-chart-labels">
                  {Array.from({ length: 7 }, (_, index) => <span className="personal-skeleton-line" key={index} />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
