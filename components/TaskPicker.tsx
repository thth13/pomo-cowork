'use client'

import { RefObject, memo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { SessionType } from '@/types'
import { TaskOption } from '@/types/task'

interface TaskPickerProps {
  sessionType: SessionType
  isDisabled: boolean
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  taskPickerRef: RefObject<HTMLDivElement>
  selectedTask: TaskOption | null
  onSelectTask: (task: TaskOption | null) => void
  filteredTaskOptions: TaskOption[]
  taskSearch: string
  onTaskSearchChange: (value: string) => void
}

export const TaskPicker = memo(function TaskPicker({
  sessionType,
  isDisabled,
  isOpen,
  onToggle,
  onClose,
  taskPickerRef,
  selectedTask,
  onSelectTask,
  filteredTaskOptions,
  taskSearch,
  onTaskSearchChange,
}: TaskPickerProps) {
  if (sessionType !== SessionType.WORK) {
    return null
  }

  const handleToggle = () => {
    if (!isDisabled) {
      onToggle()
    }
  }

  return (
    <div className="mb-6 sm:mb-8 w-full max-w-md px-4 sm:px-0">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Current Task
      </label>
      <div className="relative" ref={taskPickerRef}>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isDisabled}
          className={`group w-full rounded-xl border px-4 py-3 text-left text-sm transition focus:outline-none focus:ring-0 ${
            isDisabled
              ? 'cursor-not-allowed opacity-70 border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500'
              : `border-gray-200 dark:border-slate-700 ${
                  isOpen
                    ? 'shadow-sm shadow-blue-500/10 dark:shadow-blue-900/20 border-blue-400 dark:border-blue-500'
                    : 'hover:border-blue-300 dark:hover:border-blue-500'
                }`
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-gray-700 dark:text-slate-200">
              {selectedTask ? selectedTask.title : 'Select a task from the list'}
            </span>
            <motion.span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition group-hover:bg-blue-100 group-hover:text-blue-600 dark:bg-slate-700 dark:text-slate-300 dark:group-hover:bg-blue-900/40 dark:group-hover:text-blue-300"
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <ChevronDown size={16} />
            </motion.span>
          </div>
          <motion.div
            className={`absolute inset-x-4 bottom-0 h-0.5 rounded-full ${
              isOpen
                ? 'bg-blue-500/70 dark:bg-blue-400/70'
                : selectedTask
                  ? 'bg-gray-200 dark:bg-slate-700'
                  : 'bg-transparent'
            }`}
            layoutId="taskHighlight"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        </button>

        <AnimatePresence>
          {isOpen && !isDisabled && (
            <motion.div
              key="task-dropdown"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="absolute z-30 mt-3 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900"
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

              <div className="max-h-64 overflow-y-auto py-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectTask(null)
                    onClose()
                  }}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition ${
                    !selectedTask
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">No task selected</span>
                    <span className="text-xs text-gray-400 dark:text-slate-500">
                      Timer will run without task binding
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
                        }}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                          isActive
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                            isActive
                              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200'
                              : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {taskOption.title.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-700 dark:text-slate-200">
                            {taskOption.title}
                          </span>
                          {taskOption.description && (
                            <span className="text-xs text-gray-400 dark:text-slate-500">
                              {taskOption.description}
                            </span>
                          )}
                        </div>
                        {isActive && (
                          <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white dark:bg-blue-400">
                            <Check size={14} />
                          </span>
                        )}
                      </button>
                    )
                  })
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-slate-500">
                    No tasks match your search.
                  </div>
                )}
              </div>

              {!filteredTaskOptions.length && !taskSearch && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                  Add tasks in the list to populate this menu.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedTask?.description && (
            <motion.div
              key="task-description"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-600 dark:border-blue-900/60 dark:bg-blue-900/20 dark:text-blue-300"
            >
              {selectedTask.description}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})
