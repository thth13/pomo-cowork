'use client'

import { useJournalText } from '@/lib/journal/client'

export default function PostComposerLoading() {
  const t = useJournalText()
  return <div className="journal-card public-project-editor post-composer post-composer-skeleton" role="status" aria-label={t('Loading editor…', 'Cargando editor…')}>
    <div aria-hidden="true">
      <div className="project-editor-heading">
        <span className="project-editor-emblem composer-placeholder" />
        <div className="composer-skeleton-heading"><span className="composer-placeholder composer-skeleton-title" /><span className="composer-placeholder composer-skeleton-subtitle" /></div>
      </div>
      <div className="project-editor-layout">
        <div className="project-editor-main">
          <span className="composer-placeholder composer-skeleton-section" />
          <div className="journal-fields">
            {[0, 1].map(field => <div className="composer-skeleton-field" key={field}><span className="composer-placeholder composer-skeleton-label" /><span className="composer-placeholder composer-skeleton-input" /></div>)}
          </div>
          <div className="composer-skeleton-field"><span className="composer-placeholder composer-skeleton-label" /><span className="composer-placeholder composer-skeleton-input" /></div>
          <div className="composer-skeleton-field"><span className="composer-placeholder composer-skeleton-label" /><span className="composer-placeholder composer-skeleton-textarea" /></div>
          <span className="composer-placeholder composer-skeleton-subtitle" />
          <span className="composer-placeholder composer-skeleton-button" />
          <div className="composer-skeleton-media"><span className="composer-placeholder composer-skeleton-section" /><span className="composer-placeholder composer-skeleton-image" /></div>
        </div>
        <div className="project-editor-settings">
          <span className="composer-placeholder composer-skeleton-section" />
          <div className="post-composer-stats"><span className="composer-placeholder composer-skeleton-label" /><span className="composer-placeholder composer-skeleton-subtitle" /><span className="composer-placeholder composer-skeleton-option" /></div>
          <div className="composer-skeleton-field"><span className="composer-placeholder composer-skeleton-label" /><span className="composer-placeholder composer-skeleton-input" /></div>
          <span className="composer-placeholder composer-skeleton-option" />
        </div>
      </div>
      <div className="journal-actions project-editor-footer">{[0, 1, 2].map(action => <span key={action} className="composer-placeholder composer-skeleton-button" />)}</div>
    </div>
  </div>
}
