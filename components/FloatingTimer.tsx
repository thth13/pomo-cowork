'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { useI18n } from './I18nProvider'
import { leaderboardCopy } from '@/lib/i18n/leaderboard'
import { useAppearanceStore } from '@/store/useAppearanceStore'
import { TimerActions, type TimerActionsProps } from './TimerControls'
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
  const backLabel = leaderboardCopy[language].backToTimer

  return (
    <aside className={styles.timer} data-floating-timer aria-label={sessionLabel} data-no-translate="true" aria-busy={busy}>
      <Link href={href} className={styles.display} aria-label={`${backLabel}: ${formattedTime}`} title={backLabel}>
        <span className={styles.label}>{actions.isPaused ? t.activeSessions.paused : sessionLabel}</span>
        <span className={styles.time} data-timer-font={timerFont} role="timer" aria-live="off">{formattedTime}</span>
        <ArrowUpRight size={14} aria-hidden="true" className={styles.arrow} />
      </Link>
      {actions.currentSession && <TimerActions {...actions} presentation="inline" />}
    </aside>
  )
}
