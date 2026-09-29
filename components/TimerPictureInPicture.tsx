'use client'

import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { PictureInPicture2, X } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { TimerActions, type TimerActionsProps } from '@/components/TimerControls'
import { useDocumentPictureInPicture } from '@/hooks/useDocumentPictureInPicture'
import { TaskPicker } from '@/components/TaskPicker'
import { useTaskMenu } from '@/hooks/useTaskMenu'
import { SessionType } from '@/types'
import { TaskOption } from '@/types/task'
import { useAppearanceStore } from '@/store/useAppearanceStore'

interface TimerPictureInPictureProps {
  controller: ReturnType<typeof useDocumentPictureInPicture>
  actions: TimerActionsProps
  formattedTime: string
  sessionLabel: string
  sessionType: SessionType
  selectedTask: TaskOption | null
  taskOptions: TaskOption[]
  onSelectTask: (task: TaskOption | null) => void
  progress: number
  isTimeTracking: boolean
}

export function TimerPictureInPicture({
  controller,
  actions,
  formattedTime,
  sessionLabel,
  sessionType,
  selectedTask,
  taskOptions,
  onSelectTask,
  progress,
  isTimeTracking,
}: TimerPictureInPictureProps) {
  const { t, language } = useI18n()
  const timerFont = useAppearanceStore(state => state.timerFont)
  const { pipWindow, isSupported, isOpening, error, open, close, clearError } = controller
  const triggerRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)
  const messageId = useId()
  const status = actions.isPaused ? t.activeSessions.paused : actions.isRunning ? t.timer.running : t.timer.ready
  const label = pipWindow ? t.timer.closeMiniTimer : t.timer.openMiniTimer
  const isTaskPickerDisabled = !!actions.currentSession || actions.isStarting || actions.isStopping
  const {
    isTaskMenuOpen,
    setIsTaskMenuOpen,
    taskSearch,
    setTaskSearch,
    taskPickerRef,
    taskDropdownRef,
  } = useTaskMenu(isTaskPickerDisabled || !pipWindow || (sessionType !== SessionType.WORK && sessionType !== SessionType.TIME_TRACKING))

  useEffect(() => {
    if (pipWindow) pipWindow.document.title = `${formattedTime} · ${sessionLabel} | Pomo Cowork`
  }, [pipWindow, formattedTime, sessionLabel])

  useEffect(() => {
    if (!pipWindow) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault()
        close()
      }
    }
    pipWindow.addEventListener('keydown', onKeyDown)
    return () => pipWindow.removeEventListener('keydown', onKeyDown)
  }, [pipWindow, close])

  useEffect(() => {
    if (!pipWindow && wasOpen.current && document.hasFocus()) {
      triggerRef.current?.focus({ preventScroll: true })
    }
    wasOpen.current = !!pipWindow
  }, [pipWindow])

  const message = error === 'unsupported' ? t.timer.miniTimerUnsupported : error ? t.timer.miniTimerOpenFailed : ''

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="pixel-timer-popout"
        onClick={pipWindow ? close : open}
        disabled={isOpening || isSupported === null}
        aria-label={label}
        aria-pressed={!!pipWindow}
        aria-busy={isOpening}
        aria-describedby={message ? messageId : undefined}
        title={isSupported === false ? t.timer.miniTimerUnsupported : label}
      >
        <PictureInPicture2 size={18} aria-hidden="true" />
      </button>
      <div className="pixel-mini-timer-message" hidden={!message}>
        <p id={messageId} role="status">{message}</p>
        {message && (
          <button type="button" className="pixel-mini-timer-dismiss" aria-label={t.common.close} title={t.common.close} onClick={() => {
            clearError()
            triggerRef.current?.focus()
          }}>
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      {pipWindow && createPortal(
        <main className="mini-timer" lang={language} data-no-translate="true">
          <header className="mini-timer-header">
            <span className="mini-timer-label">{sessionLabel}</span>
            <span className="mini-timer-status" role="status">
              <span className={actions.isRunning ? 'pixel-led active' : 'pixel-led'} aria-hidden="true" />
              {status}
            </span>
          </header>
          <div className="mini-timer-display">
            <div className={`mini-timer-digits${formattedTime.length > 5 ? ' mini-timer-digits-long' : ''}`} data-timer-font={timerFont} role="timer" aria-label={sessionLabel} aria-live="off">
              {formattedTime}
            </div>
            <TaskPicker
              variant="mini-timer"
              sessionType={sessionType}
              isDisabled={isTaskPickerDisabled}
              isOpen={isTaskMenuOpen}
              onToggle={() => setIsTaskMenuOpen(value => !value)}
              onClose={() => setIsTaskMenuOpen(false)}
              taskPickerRef={taskPickerRef}
              taskDropdownRef={taskDropdownRef}
              selectedTask={selectedTask}
              onSelectTask={onSelectTask}
              filteredTaskOptions={taskOptions}
              taskSearch={taskSearch}
              onTaskSearchChange={setTaskSearch}
              hasTaskOptions={taskOptions.length > 0}
            />
            {!isTimeTracking && (
              <div className="pixel-timer-track mini-timer-track" role="progressbar" aria-label={sessionLabel} aria-valuenow={Math.round(Math.max(0, Math.min(100, progress)))} aria-valuemin={0} aria-valuemax={100}>
                {Array.from({ length: 24 }, (_, i) => <span key={i} className={progress >= (i + 1) / 24 * 100 ? 'filled' : ''} />)}
              </div>
            )}
          </div>
          <TimerActions {...actions} compact />
        </main>,
        pipWindow.document.body
      )}
    </>
  )
}
