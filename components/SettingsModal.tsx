'use client'

import { memo } from 'react'

interface TimerSettingsForm {
  workDuration: number
  shortBreak: number
  longBreak: number
}

interface SettingsModalProps {
  isOpen: boolean
  settings: TimerSettingsForm
  onChange: (field: keyof TimerSettingsForm, value: number) => void
  onSave: () => void | Promise<void>
  onClose: () => void
}

export const SettingsModal = memo(function SettingsModal({
  isOpen,
  settings,
  onChange,
  onSave,
  onClose,
}: SettingsModalProps) {
  if (!isOpen) {
    return null
  }

  const handleWrapperClick = () => {
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={handleWrapperClick}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-700 p-6 space-y-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Timer settings</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Adjust durations in minutes for each session type
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
              Focus length
            </span>
            <input
              type="number"
              min={1}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              value={settings.workDuration}
              onChange={(event) => onChange('workDuration', Number(event.target.value))}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
              Short break
            </span>
            <input
              type="number"
              min={1}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              value={settings.shortBreak}
              onChange={(event) => onChange('shortBreak', Number(event.target.value))}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
              Long break
            </span>
            <input
              type="number"
              min={1}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              value={settings.longBreak}
              onChange={(event) => onChange('longBreak', Number(event.target.value))}
            />
          </label>
        </div>

        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
})
