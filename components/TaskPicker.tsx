'use client'

import { RefObject, memo, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { SessionType } from '@/types'
import { TaskOption } from '@/types/task'
import { useI18n } from '@/components/I18nProvider'

interface TaskPickerProps {
  sessionType: SessionType
  isDisabled: boolean
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  taskPickerRef: RefObject<HTMLDivElement>
  taskDropdownRef: RefObject<HTMLDivElement>
  selectedTask: TaskOption | null
  onSelectTask: (task: TaskOption | null) => void
  filteredTaskOptions: TaskOption[]
  taskSearch: string
  onTaskSearchChange: (value: string) => void
  hasTaskOptions: boolean
}

export const TaskPicker = memo(function TaskPicker({
  sessionType,
  isDisabled,
  isOpen,
  onToggle,
  onClose,
  taskPickerRef,
  taskDropdownRef,
  selectedTask,
  onSelectTask,
  filteredTaskOptions,
  taskSearch,
  onTaskSearchChange,
  hasTaskOptions,
}: TaskPickerProps) {
  const { t } = useI18n()
  const pickerId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState<{
    left: number
    top?: number
    bottom?: number
    width: number
    maxHeight: number
  } | null>(null)
  const isVisible = isOpen && !isDisabled &&
    (sessionType === SessionType.WORK || sessionType === SessionType.TIME_TRACKING)

  useLayoutEffect(() => {
    if (!isVisible) return

    const updatePosition = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const gap = 12
      const margin = 8
      const below = window.innerHeight - rect.bottom - gap - margin
      const above = rect.top - gap - margin
      const openAbove = below < 256 && above > below
      const width = Math.min(rect.width, window.innerWidth - margin * 2)
      setPosition({
        left: Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin)),
        ...(openAbove
          ? { bottom: window.innerHeight - rect.top + gap }
          : { top: rect.bottom + gap }),
        width,
        maxHeight: Math.max(0, Math.min(320, openAbove ? above : below)),
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    const observer = new ResizeObserver(updatePosition)
    if (triggerRef.current) observer.observe(triggerRef.current)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      observer.disconnect()
    }
  }, [isVisible])

  if (sessionType !== SessionType.WORK && sessionType !== SessionType.TIME_TRACKING) {
    return null
  }

  const handleToggle = () => {
    if (!isDisabled) {
      onToggle()
    }
  }

  return (
    <div className="mb-6 w-full max-w-sm px-4 sm:px-0">
      <div className="relative" ref={taskPickerRef}>
        <button
          ref={triggerRef}
          id={pickerId}
          type="button"
          onClick={handleToggle}
          onKeyDown={(event) => {
            if (isVisible && (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey))) {
              event.preventDefault()
              taskDropdownRef.current?.querySelector('button')?.focus()
            }
          }}
          disabled={isDisabled}
          aria-expanded={isOpen && !isDisabled}
          aria-controls={`${pickerId}-options`}
          aria-label={`${t.timer.currentTask}: ${selectedTask ? selectedTask.title : t.timer.selectTask}`}
          className="flex min-h-10 w-full items-center justify-center gap-2 rounded-sm px-2 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:underline focus-visible:underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <span className="shrink-0 text-xs text-gray-500 dark:text-slate-400">{t.timer.currentTask}:</span>
          <span className="min-w-0 truncate" title={selectedTask?.title}>
            {selectedTask ? selectedTask.title : t.timer.selectTask}
          </span>
          <ChevronDown size={14} aria-hidden="true" className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {position && createPortal(
          <AnimatePresence>
            {isVisible && (
              <motion.div
                key="task-dropdown"
                ref={taskDropdownRef}
                style={position}
                id={`${pickerId}-options`}
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900"
              >
                {/* <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-3 text-xs text-gray-400 dark:border-slate-800 dark:text-slate-500">
                  <Search size={14} />
                  <input
                    autoFocus
                    value={taskSearch}
                    onChange={(event) => onTaskSearchChange(event.target.value)}
                    placeholder="Find task..."
                    className="w-full bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400 dark:text-slate-200 dark:placeholder:text-slate-500"
                  />
                </div> */}

                <div className="min-h-0 overflow-y-auto overscroll-contain py-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTask(null)
                      onClose()
                      triggerRef.current?.focus()
                    }}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition ${
                      !selectedTask
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300'
                        : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{t.timer.noTaskSelected}</span>
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {t.timer.noTaskSubtitle}
                      </span>
                    </div>
                  </button>

                  {filteredTaskOptions.length ? (
                    filteredTaskOptions.map((taskOption) => {
                      const isActive = selectedTask?.id === taskOption.id
                      return (
                        <button
                          type="button"
                          key={taskOption.id}
                          onClick={() => {
                            onSelectTask(taskOption)
                            onClose()
                            triggerRef.current?.focus()
                          }}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                            isActive
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300'
                              : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-medium">
                              {taskOption.title}
                            </span>
                            {taskOption.description && (
                              <span className="line-clamp-2 text-xs text-gray-400 dark:text-slate-400">
                                {taskOption.description}
                              </span>
                          )}
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-slate-500">
                    {t.timer.noMatchingTasks}
                  </div>
                )}
              </div>

              {!hasTaskOptions && (
                <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                  {t.timer.taskMenuEmpty}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
        )}

        <AnimatePresence>
          {selectedTask?.description && (
            <motion.div
              key="task-description"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="mt-1 px-2 text-center text-xs leading-relaxed text-gray-500 dark:text-slate-400"
            >
              {selectedTask.description}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})
