'use client'

import Link from 'next/link'
import { ArrowUpRight, Pause, Play, Square } from 'lucide-react'
import { useI18n } from './I18nProvider'
import { leaderboardCopy } from '@/lib/i18n/leaderboard'
import { useAppearanceStore } from '@/store/useAppearanceStore'
import type { TimerActionsProps } from './TimerControls'
import styles from './FloatingTimer.module.css'

interface FloatingTimerProps {
  actions: TimerActionsProps
  formattedTime: string
  sessionLabel: string
  href: string
}

export default function FloatingTimer({ actions, formattedTime, sessionLabel, href }: FloatingTimerProps) {
  const { t, language } = useI18n()
  const timerFont = useAppearanceStore(state => state.timerFont)
  const busy = actions.isStarting || actions.isStopping || actions.isPausing || actions.isResuming
  const pauseLabel = actions.isPausing ? t.timer.pausing : actions.isResuming ? t.timer.resuming : actions.isPaused ? t.timer.resume : t.timer.pause
  const backLabel = leaderboardCopy[language].backToTimer

  return (
    <aside className={styles.timer} data-floating-timer aria-label={sessionLabel} data-no-translate="true" aria-busy={busy}>
      <Link href={href} className={styles.display} aria-label={`${backLabel}: ${formattedTime}`} title={backLabel}>
        <span className={styles.label}>{actions.isPaused ? t.activeSessions.paused : sessionLabel}</span>
        <span className={styles.time} data-timer-font={timerFont} role="timer" aria-live="off">{formattedTime}</span>
        <ArrowUpRight size={14} aria-hidden="true" className={styles.arrow} />
      </Link>
      {actions.currentSession && <div className={styles.actions}>
        <button type="button" onClick={actions.isPaused ? actions.onResume : actions.onPause}
          disabled={busy || (!actions.isPaused && (!actions.isRunning || actions.currentSession.id.startsWith('temp_')))}
          aria-label={pauseLabel} title={pauseLabel}>
          {actions.isPaused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}
        </button>
        <button type="button" onClick={actions.onStop} disabled={busy}
          aria-label={actions.isStopping ? t.timer.stopping : t.timer.stop} title={t.timer.stop}>
          <Square size={15} aria-hidden="true" />
        </button>
      </div>}
    </aside>
  )
}
