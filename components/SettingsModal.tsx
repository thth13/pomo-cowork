'use client'

import { Crown, Timer, Coffee, Armchair, Repeat2, Check, Loader2 } from 'lucide-react'
import { memo, useId, useRef, useState } from 'react'
import { useI18n } from '@/components/I18nProvider'
import CommunityDialog from '@/components/CommunityDialog'

interface TimerSettingsForm {
  workDuration: number
  shortBreak: number
  longBreak: number
  longBreakAfter: number
}

interface SettingsModalProps {
  saveError?: string
  isOpen: boolean
  settings: TimerSettingsForm
  onChange: (field: keyof TimerSettingsForm, value: number) => void
  onSave: () => void | Promise<void>
  onClose: () => void
  isTimerRunning: boolean
  isAutoStartEnabled: boolean
  onToggleAutoStart: () => void
  isTimeTrackerMode: boolean
  onToggleTimeTrackerMode: () => void
  onOpenPaywall?: () => void
  isProMember: boolean
}

export const SettingsModal = memo(function SettingsModal({
  saveError,
  isOpen,
  settings,
  onChange,
  onSave,
  onClose,
  isTimerRunning,
  isAutoStartEnabled,
  onToggleAutoStart,
  isTimeTrackerMode,
  onToggleTimeTrackerMode,
  onOpenPaywall,
  isProMember,
}: SettingsModalProps) {
  const { t } = useI18n()
  const [isSaving, setIsSaving] = useState(false)
  const savePendingRef = useRef(false)
  const trackerLabelId = useId()
  const trackerDescriptionId = useId()
  const autoStartLabelId = useId()
  const autoStartDescriptionId = useId()
  const isTimeTrackerLocked = !isProMember
  const fields = [
    { key: 'workDuration', label: t.timer.focusLength, icon: Timer, min: 1, max: 60 },
    { key: 'shortBreak', label: t.timer.shortBreakInput, icon: Coffee, min: 1, max: 30 },
    { key: 'longBreak', label: t.timer.longBreakInput, icon: Armchair, min: 1, max: 60 },
    { key: 'longBreakAfter', label: t.timer.sessionsBeforeLongBreak, icon: Repeat2, min: 2, max: 10 },
  ] as const

  const handleSave = async () => {
    if (savePendingRef.current) return
    savePendingRef.current = true
    setIsSaving(true)
    try {
      await onSave()
    } finally {
      savePendingRef.current = false
      setIsSaving(false)
    }
  }

  return (
    <CommunityDialog open={isOpen} title={t.settingsModal.title}
      description={t.settingsModal.description} onClose={onClose}
      busy={isSaving} variant="timer-settings" dismissOnBackdrop>
      <form noValidate onSubmit={event => { event.preventDefault(); void handleSave() }} className="timer-settings-form">
        <div className="timer-settings-content">
          <section className="timer-settings-option" aria-labelledby={trackerLabelId}>
            <div className="timer-settings-option-copy">
              <div className="timer-settings-option-heading">
                <h3 id={trackerLabelId}>{t.settingsModal.timeTrackerMode}</h3>
              </div>
              <p id={trackerDescriptionId}>{t.settingsModal.timeTrackerDescription}</p>
            </div>
            <div className="timer-settings-mode-control">
              {isTimeTrackerLocked && (
                <button type="button" className="timer-settings-pro" disabled={isTimerRunning || isSaving || !onOpenPaywall}
                  aria-label={`${t.settingsModal.timeTrackerMode} · Pro`}
                  onClick={() => { onClose(); onOpenPaywall?.() }}>
                  <Crown size={12} aria-hidden="true" />Pro
                </button>
              )}
              <button type="button" role="switch" aria-checked={isTimeTrackerMode}
                aria-label={isTimeTrackerLocked ? `${t.settingsModal.timeTrackerMode} · Pro` : t.settingsModal.timeTrackerMode}
                aria-describedby={trackerDescriptionId}
                className="timer-settings-switch" disabled={isTimeTrackerLocked || isTimerRunning || isSaving}
                onClick={onToggleTimeTrackerMode}>
                <span className="timer-settings-switch-track" aria-hidden="true"><span>{isTimeTrackerMode && <Check size={12} />}</span></span>
                <span>{isTimeTrackerMode ? t.common.enabled : t.common.disabled}</span>
              </button>
            </div>
          </section>
          {isTimerRunning && <p className="timer-settings-hint">{t.settingsModal.stopTimerToSwitch}</p>}

          {!isTimeTrackerMode && (
            <>
              <div className="timer-settings-grid">
                {fields.map(({ key, label, icon: Icon, min, max }) => (
                  <label key={key} className="timer-settings-field" data-field={key}>
                    <span className="timer-settings-field-label"><Icon size={15} aria-hidden="true" />{label}</span>
                    <input type="number" min={min} max={max} step={1} inputMode="numeric" disabled={isSaving}
                      value={settings[key] === 0 ? '' : settings[key]}
                      onChange={event => onChange(key, event.target.value === '' ? 0 : Number(event.target.value))} />
                  </label>
                ))}
              </div>
              <section className="timer-settings-option timer-settings-auto" aria-labelledby={autoStartLabelId}>
                <div className="timer-settings-option-copy">
                  <h3 id={autoStartLabelId}>{t.settingsModal.autoStart}</h3>
                  <p id={autoStartDescriptionId}>{t.settingsModal.autoStartDescription}</p>
                </div>
                <button type="button" role="switch" aria-checked={isAutoStartEnabled}
                  aria-labelledby={autoStartLabelId} aria-describedby={autoStartDescriptionId}
                  className="timer-settings-switch" onClick={onToggleAutoStart} disabled={isSaving}>
                  <span className="timer-settings-switch-track" aria-hidden="true"><span>{isAutoStartEnabled && <Check size={12} />}</span></span>
                  <span>{isAutoStartEnabled ? t.common.enabled : t.common.disabled}</span>
                </button>
              </section>
            </>
          )}
        </div>
        {saveError && <p role="alert" className="text-red-600 px-4 pb-3 text-sm">{saveError}</p>}
        <footer className="timer-settings-footer">
          <button type="button" onClick={onClose} disabled={isSaving} className="timer-settings-button">{t.common.cancel}</button>
          <button type="submit" disabled={isSaving} aria-busy={isSaving} className="timer-settings-button timer-settings-save">
            {isSaving ? <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
            {t.common.saveChanges}
          </button>
        </footer>
      </form>
    </CommunityDialog>
  )
})
