'use client'

import { useJournalText } from '@/lib/journal/client'

export default function PublicProjectsLoading() {
  const t = useJournalText()
  return <div className="project-catalog-grid" role="status" aria-label={t('Loading projects', 'Cargando proyectos')}>
    {Array.from({ length: 12 }, (_, index) => <div key={index} className="journal-card project-catalog-card project-catalog-skeleton" aria-hidden="true">
      <div className="project-catalog-header">
        <div className="project-catalog-identity">
          <span className="project-catalog-logo catalog-placeholder" />
          <div className="project-catalog-copy catalog-placeholder-stack">
            <span className="catalog-placeholder catalog-placeholder-title" />
            <span className="catalog-placeholder catalog-placeholder-short" />
          </div>
        </div>
        <span className="catalog-placeholder catalog-placeholder-bookmark" />
      </div>
      <div className="project-catalog-progress">
        <div><span className="catalog-placeholder catalog-placeholder-label" /><span className="catalog-placeholder catalog-placeholder-number" /></div>
        <span className="catalog-placeholder catalog-placeholder-track" />
      </div>
      <div className="project-catalog-activity">
        <div className="project-catalog-metrics">
          {[0, 1, 2].map(metric => <div key={metric}><span className="catalog-placeholder catalog-placeholder-short" /><span className="catalog-placeholder catalog-placeholder-value" /></div>)}
        </div>
        <div className="project-catalog-week-row">
          <span className="catalog-placeholder catalog-placeholder-short" />
          <div className="project-catalog-week">{Array.from({ length: 7 }, (_, day) => <span key={day} className="catalog-placeholder" />)}</div>
        </div>
      </div>
      <div className="project-catalog-footer">
        <div className="project-catalog-author">
          <span className="project-catalog-avatar catalog-placeholder" />
          <div className="catalog-placeholder-stack"><span className="catalog-placeholder catalog-placeholder-label" /><span className="catalog-placeholder catalog-placeholder-short" /></div>
        </div>
        <span className="catalog-placeholder catalog-placeholder-number" />
      </div>
    </div>)}
  </div>
}
