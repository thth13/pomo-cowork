'use client'

import { memo } from 'react'
import { Play, Square, Pause } from 'lucide-react'
import { PomodoroSession, SessionType } from '@/types'

interface TimerControlsProps {
  currentSession: PomodoroSession | null
  sessionType: SessionType
  onSessionTypeChange: (type: SessionType) => void
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

export const TimerControls = memo(function TimerControls({
  currentSession,
  sessionType,
  onSessionTypeChange,
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
}: TimerControlsProps) {
  return (
    <>
      <div className="flex flex-col items-center gap-3 sm:gap-4 mb-6 sm:mb-8 px-4 sm:px-0 w-full sm:w-auto">
        <div className="w-full sm:w-auto">
          {!currentSession ? (
            <button
              onClick={onStart}
              disabled={isStarting}
              className={`w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white px-6 sm:px-8 py-3 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2 ${
                isStarting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Play size={20} />
              <span>{isStarting ? 'Starting...' : 'Start'}</span>
            </button>
          ) : (
            <div className="flex w-full sm:w-auto gap-3">
              <button
                onClick={onStop}
                disabled={isStopping}
                className={`flex-1 sm:flex-none w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2 ${
                  isStopping ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Square size={20} />
                <span>{isStopping ? 'Stopping...' : 'Stop'}</span>
              </button>
              {!isPaused && (
                <button
                  onClick={onPause}
                  disabled={!isRunning || isPausing}
                  className={`flex-1 sm:flex-none w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2 ${
                    (!isRunning || isPausing) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Pause size={20} />
                  <span>{isPausing ? 'Pausing...' : 'Pause'}</span>
                </button>
              )}
              {isPaused && (
                <button
                  onClick={onResume}
                  disabled={isResuming}
                  className={`flex-1 sm:flex-none w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2 ${
                    isResuming ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Play size={20} />
                  <span>{isResuming ? 'Resuming...' : 'Resume'}</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 border border-gray-200 dark:border-slate-700 mb-4 sm:mb-6 mx-4 sm:mx-0">
        {[SessionType.WORK, SessionType.SHORT_BREAK, SessionType.LONG_BREAK].map((type) => {
          const isActive = sessionType === type
          const label =
            type === SessionType.WORK
              ? 'Focus'
              : type === SessionType.SHORT_BREAK
                ? 'Short Break'
                : 'Long Break'

          return (
            <button
              key={type}
              onClick={() => onSessionTypeChange(type)}
              disabled={!!currentSession}
              className={`flex-1 sm:flex-none sm:px-6 px-3 py-2 rounded-lg font-medium text-sm sm:text-base ${
                isActive
                  ? 'bg-red-500 text-white'
                  : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
              } ${currentSession ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </>
  )
})
