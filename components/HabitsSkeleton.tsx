'use client'

import { useI18n } from '@/components/I18nProvider'
import { HabitStatisticsSkeleton } from '@/components/HabitStatistics'

export default function HabitsSkeleton({ compact = false, guest = false }: { compact?: boolean; guest?: boolean }) {
  const { t } = useI18n()

  return <div className="habits-skeleton" role="status" aria-label={t.common.loading}>
    <div aria-hidden="true">
      <div className={compact ? undefined : 'habits-overview'}>
        <div className="habits-today">
          <div className="habits-summary">
            <h2><span className="personal-skeleton-line habit-skeleton-heading" /></h2>
            <span className="personal-skeleton-line habit-skeleton-count" />
          </div>
          <div className="personal-skeleton-line habit-skeleton-progress" />
          <ul className="habit-list">
            {Array.from({ length: 3 }, (_, index) => <li key={index}>
              <span className="habit-check personal-skeleton-line" />
              <div className="habit-name">
                <span className="personal-skeleton-line habit-skeleton-name" />
                <small><span className="personal-skeleton-line habit-skeleton-streak" /></small>
              </div>
              {!compact && <div className="habit-row-actions">
                <span className="habit-icon"><span className="personal-skeleton-line habit-skeleton-icon" /></span>
                <span className="habit-icon"><span className="personal-skeleton-line habit-skeleton-icon" /></span>
              </div>}
            </li>)}
          </ul>
        </div>
        {!compact && <aside className="habit-create-panel">
          <div className="habit-form">
            <span className="personal-skeleton-line habit-skeleton-label" />
            <div className="habit-form-controls">
              <span className="personal-skeleton-line habit-skeleton-input" />
              <span className="habit-button personal-skeleton-line" />
            </div>
            <span className="habit-field-error" />
          </div>
          {guest && <div className="habit-guest habit-skeleton-guest">
            <span className="personal-skeleton-line" />
            <span className="personal-skeleton-line" />
          </div>}
        </aside>}
      </div>
      {!compact && <HabitStatisticsSkeleton />}
      {!compact && <section className="habit-history">
        <div className="habit-history-heading">
          <h2><span className="personal-skeleton-line habit-skeleton-heading" /></h2>
          <div className="habit-week-nav">
            <span className="habit-icon"><span className="personal-skeleton-line habit-skeleton-icon" /></span>
            <span className="personal-skeleton-line habit-skeleton-date" />
            <span className="habit-icon"><span className="personal-skeleton-line habit-skeleton-icon" /></span>
            <span className="habit-button personal-skeleton-line habit-skeleton-current" />
          </div>
        </div>
        <div className="habit-history-scroll">
          <table>
            <thead><tr>
              <th><span className="personal-skeleton-line habit-skeleton-name" /></th>
              {Array.from({ length: 7 }, (_, index) => <th key={index}><span className="personal-skeleton-line habit-skeleton-weekday" /><strong><span className="personal-skeleton-line habit-skeleton-icon" /></strong></th>)}
              <th><span className="personal-skeleton-line habit-skeleton-total" /></th>
            </tr></thead>
            <tbody>{Array.from({ length: 3 }, (_, index) => <tr key={index}>
              <th><span className="personal-skeleton-line habit-skeleton-name" /></th>
              {Array.from({ length: 7 }, (_, day) => <td key={day}><span className="habit-check habit-day personal-skeleton-line" /></td>)}
              <td><span className="personal-skeleton-line habit-skeleton-total" /></td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>}
    </div>
  </div>
}
