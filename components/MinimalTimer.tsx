'use client'

import { createPortal } from 'react-dom'
import { Settings } from 'lucide-react'
import AppearanceSettings from './AppearanceSettings'
import WorkspaceWindow from './WorkspaceWindow'
import { TimerControls, type TimerActionsProps } from './TimerControls'
import { useI18n } from './I18nProvider'
import { gardenCopy } from '@/lib/i18n/garden'
import { SessionType } from '@/types'
import { useAppearanceStore } from '@/store/useAppearanceStore'
import styles from './MinimalTimer.module.css'

export const MINIMAL_TIMER_ID = 'workspace-minimal-timer'
const activate = () => {}

interface MinimalTimerProps {
  open: boolean
  onClose: () => void
  onOpenSettings: () => void
  actions: TimerActionsProps
  formattedTime: string
  sessionLabel: string
  sessionType: SessionType
  onSessionTypeChange: (type: SessionType) => void
}

export default function MinimalTimer({ open, onClose, onOpenSettings, actions, formattedTime, sessionLabel, sessionType, onSessionTypeChange }: MinimalTimerProps) {
  const { t, language } = useI18n()
  const timerFont = useAppearanceStore(state => state.timerFont)
  const status = actions.isPaused ? t.activeSessions.paused : actions.isRunning ? t.timer.running : t.timer.ready
  if (typeof document === 'undefined') return null
  const close = () => {
    const restoreFocus = document.getElementById(MINIMAL_TIMER_ID)?.contains(document.activeElement)
    onClose()
    if (restoreFocus) requestAnimationFrame(() => {
      const selector = window.matchMedia('(max-width: 719px)').matches
        ? '[data-workspace-menu-trigger]'
        : `.workspace-dock button[aria-controls="${MINIMAL_TIMER_ID}"]`
      document.querySelector<HTMLButtonElement>(selector)?.focus({ preventScroll: true })
    })
  }

  return createPortal(
    <WorkspaceWindow id={MINIMAL_TIMER_ID} title={gardenCopy[language].minimalTimer}
      variant="timer" open={open} offset={0} layer={9} onActivate={activate} onClose={close}
      headerAction={<>
        <AppearanceSettings triggerClassName={styles.headerButton} />
        <button type="button" className={styles.headerButton} onClick={onOpenSettings}
          aria-haspopup="dialog" aria-label={t.settingsModal.title} title={t.settingsModal.title}>
          <Settings size={16} aria-hidden="true" />
        </button>
      </>}>
      <div className={styles.content} data-no-translate="true">
        <div className={styles.display}>
          <div className={styles.time} data-timer-font={timerFont} data-long={formattedTime.length > 5}
            role="timer" aria-label={sessionLabel} aria-live="off">{formattedTime}</div>
          <span className={styles.status} role="status">{status}</span>
        </div>
        <div className={styles.controls}>
          <TimerControls {...actions} compact sessionType={sessionType} onSessionTypeChange={onSessionTypeChange} />
        </div>
      </div>
    </WorkspaceWindow>, document.body
  )
}
