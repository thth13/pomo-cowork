'use client'

import { memo, type ReactNode } from 'react'
import { Play, Square, Pause } from 'lucide-react'
import { PomodoroSession, SessionType } from '@/types'
import { useI18n } from '@/components/I18nProvider'

export interface TimerActionsProps {
  stopLabel?: string
  currentSession: PomodoroSession | null
  onStart: () => void | Promise<void>
  onPause: () => void | Promise<void>
  onResume: () => void | Promise<void>
  onStop: () => void | Promise<void>
  isStarting: boolean
  isStopping: boolean
  isPausing: boolean
  isResuming: boolean
  isRunning: boolean
  isPaused: boolean
}

export const TimerActions = memo(function TimerActions({
  stopLabel,
  currentSession,
  onStart,
  onPause,
  onResume,
  onStop,
  isStarting,
  isStopping,
  isPausing,
  isResuming,
  isRunning,
  isPaused,
  compact = false,
}: TimerActionsProps & { compact?: boolean }) {
  const { t } = useI18n()
  const isBusy = isStarting || isStopping || isPausing || isResuming

  return (
    <div className={`timer-actions flex flex-col items-center gap-3 sm:gap-4 px-4 sm:px-0 w-full sm:w-auto${compact ? ' timer-actions-compact' : ''}`} aria-busy={isBusy}>
      <div className="w-full sm:w-auto">
        {!currentSession ? (
          <button
            type="button"
            onClick={onStart}
            disabled={isBusy}
            className={`timer-primary-action w-full sm:w-auto bg-rose-500 hover:bg-rose-600 text-white px-6 sm:px-8 py-3 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2 ${
              isStarting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Play size={20} />
            <span>{isStarting ? t.timer.starting : t.timer.start}</span>
          </button>
        ) : (
          <div className="flex w-full sm:w-auto gap-3">
            <button
              type="button"
              onClick={onStop}
              disabled={isBusy}
              className={`timer-stop-action flex-1 sm:flex-none w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2 ${
                isStopping ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Square size={20} />
              <span>{isStopping ? t.timer.stopping : stopLabel ?? t.timer.stop}</span>
            </button>
            <button
              type="button"
              onClick={isPaused ? onResume : onPause}
              disabled={isBusy || (!isPaused && (!isRunning || currentSession.id.startsWith('temp_')))}
              className={`timer-primary-action flex-1 sm:flex-none w-full sm:w-auto text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2 ${
                isPaused ? 'bg-green-500 hover:bg-green-600' : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              {isPaused ? <Play size={20} /> : <Pause size={20} />}
              <span>{isPausing ? t.timer.pausing : isResuming ? t.timer.resuming : isPaused ? t.timer.resume : t.timer.pause}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

interface TimerControlsProps extends TimerActionsProps {
  children?: ReactNode
  sessionType: SessionType
  onSessionTypeChange: (type: SessionType) => void
}

export const TimerControls = memo(function TimerControls({
  children,
  sessionType,
  onSessionTypeChange,
  ...actions
}: TimerControlsProps) {
  const { t } = useI18n()
  const { currentSession } = actions

  return (
    <>
      {children}

      <TimerActions {...actions} />

      {sessionType !== SessionType.TIME_TRACKING && (
        <div className="timer-mode-tabs" role="group" aria-label={t.timer.focus}>
          {[SessionType.WORK, SessionType.SHORT_BREAK, SessionType.LONG_BREAK].map((type) => {
            const isActive = sessionType === type
            const label =
              type === SessionType.WORK
                ? t.timer.focus
                : type === SessionType.SHORT_BREAK
                  ? t.timer.shortBreak
                  : t.timer.longBreak

            return (
              <button
                type="button"
                key={type}
                aria-pressed={isActive}
                onClick={() => onSessionTypeChange(type)}
                disabled={!!currentSession}
                className="timer-mode-tab"
              >
                {label}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
})
