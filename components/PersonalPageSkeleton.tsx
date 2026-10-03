'use client'

import { useI18n } from '@/components/I18nProvider'

type SkeletonVariant = 'profile' | 'habits' | 'projects' | 'rooms' | 'leaderboard' | 'statistics'

export default function PersonalPageSkeleton({ variant }: { variant: SkeletonVariant }) {
  const { t } = useI18n()
  const cards = variant === 'projects' ? 1 : variant === 'rooms' ? 3 : variant === 'leaderboard' ? 4 : 2

  if (variant === 'profile') {
    return (
      <section className="profile-skeleton" role="status" aria-label={t.common.loading}>
        <header className="profile-header profile-skeleton-header">
          <span className="profile-skeleton-avatar" />
          <div className="profile-identity profile-skeleton-identity">
            <span className="personal-skeleton-line title" />
            <span className="personal-skeleton-line medium" />
            <span className="personal-skeleton-line copy" />
            <span className="personal-skeleton-line narrow" />
          </div>
          <span className="profile-skeleton-live" />
        </header>
        <div className="community-metrics profile-metrics profile-skeleton-metrics">
          {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
        </div>
        <div className="profile-columns">
          <div className="community-stack">
            <section className="community-panel profile-skeleton-panel profile-skeleton-heatmap">
              <span className="personal-skeleton-line medium" />
              <span className="profile-skeleton-grid" />
              <span className="personal-skeleton-line copy" />
            </section>
            <section className="community-panel profile-skeleton-panel profile-skeleton-chart">
              <span className="personal-skeleton-line medium" />
              <span className="profile-skeleton-chart-area" />
            </section>
            <section className="community-panel profile-skeleton-panel">
              <span className="personal-skeleton-line medium" />
              <span className="personal-skeleton-line copy" />
              <span className="personal-skeleton-line copy narrow" />
              <span className="personal-skeleton-line copy" />
            </section>
          </div>
          <aside className="community-panel profile-skeleton-panel profile-skeleton-recent">
            <span className="personal-skeleton-line medium" />
            {Array.from({ length: 5 }, (_, index) => <span key={index} className="profile-skeleton-session" />)}
          </aside>
        </div>
      </section>
    )
  }

  return (
    <section className={`personal-page-skeleton personal-page-skeleton-${variant}`} role="status" aria-label={t.common.loading}>
      <div className="personal-skeleton-cards">
        {Array.from({ length: cards }, (_, index) => <div key={index} className="personal-skeleton-card">
          <span className="personal-skeleton-line medium" />
          <span className="personal-skeleton-line copy" />
          <span className="personal-skeleton-line copy narrow" />
        </div>)}
      </div>
    </section>
  )
}
