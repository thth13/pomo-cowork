'use client'

import { useI18n } from './I18nProvider'

export const MOCK_WORKER_COUNT = 4

// Temporary, hardcoded layout previews. These are not real sessions or profile links.
export default function MockWorkingSessions() {
  const { t } = useI18n()

  return (
    <>
      <div className="coworker-tile">
        <div className="coworker-tile-preview">
          <span className="coworker-tile-avatar" aria-hidden="true">AM</span>
          <span className="coworker-tile-details">
            <span className="coworker-tile-name">Alex Morgan</span>
            <span className="coworker-tile-task">Building the dashboard</span>
            <span className="coworker-tile-time">18:42</span>
            <span className="coworker-tile-status">
              <span className="coworker-tile-dot bg-green-400" aria-hidden="true" />
              <span>{t.activeSessions.working}</span>
            </span>
            <span className="coworker-tile-progress" role="progressbar" aria-label={`Alex Morgan: ${t.activeSessions.remaining}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={75}>
              <span style={{ width: '75%' }} />
            </span>
          </span>
        </div>
      </div>
      <div className="coworker-tile">
        <div className="coworker-tile-preview">
          <span className="coworker-tile-avatar" aria-hidden="true">SC</span>
          <span className="coworker-tile-details">
            <span className="coworker-tile-name">Sofia Chen</span>
            <span className="coworker-tile-task">Designing the task planner</span>
            <span className="coworker-tile-time">32:15</span>
            <span className="coworker-tile-status">
              <span className="coworker-tile-dot bg-green-400" aria-hidden="true" />
              <span>{t.activeSessions.working}</span>
            </span>
            <span className="coworker-tile-progress" role="progressbar" aria-label={`Sofia Chen: ${t.activeSessions.remaining}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={65}>
              <span style={{ width: '65%' }} />
            </span>
          </span>
        </div>
      </div>
      <div className="coworker-tile">
        <div className="coworker-tile-preview">
          <span className="coworker-tile-avatar" aria-hidden="true">DR</span>
          <span className="coworker-tile-details">
            <span className="coworker-tile-name">Daniel Reed</span>
            <span className="coworker-tile-task">Reviewing pull requests</span>
            <span className="coworker-tile-time">07:30</span>
            <span className="coworker-tile-status">
              <span className="coworker-tile-dot bg-green-400" aria-hidden="true" />
              <span>{t.activeSessions.working}</span>
            </span>
            <span className="coworker-tile-progress" role="progressbar" aria-label={`Daniel Reed: ${t.activeSessions.remaining}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={30}>
              <span style={{ width: '30%' }} />
            </span>
          </span>
        </div>
      </div>
      <div className="coworker-tile">
        <div className="coworker-tile-preview">
          <span className="coworker-tile-avatar" aria-hidden="true">EW</span>
          <span className="coworker-tile-details">
            <span className="coworker-tile-name">Emma Wilson</span>
            <span className="coworker-tile-task">Writing project documentation</span>
            <span className="coworker-tile-time">21:10</span>
            <span className="coworker-tile-status">
              <span className="coworker-tile-dot bg-green-400" aria-hidden="true" />
              <span>{t.activeSessions.working}</span>
            </span>
            <span className="coworker-tile-progress" role="progressbar" aria-label={`Emma Wilson: ${t.activeSessions.remaining}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={85}>
              <span style={{ width: '85%' }} />
            </span>
          </span>
        </div>
      </div>
    </>
  )
}
