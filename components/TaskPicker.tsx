'use client'

import { compareTaskActivity } from '@/lib/taskActivity'

import { isTaskSelectionLocked } from '@/lib/taskSelection'

import { RefObject, memo, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronDown, Plus, X } from 'lucide-react'
import { taskPickerCopy } from '@/lib/i18n/taskPicker'
import { useQuickTasks } from '@/hooks/useQuickTasks'
import { useAppearanceStore } from '@/store/useAppearanceStore'
import { useTimerStore } from '@/store/useTimerStore'
import { SessionType } from '@/types'
import { projectColorStyle } from '@/lib/projectColors'
import { TaskOption } from '@/types/task'
import { useI18n } from '@/components/I18nProvider'

interface TaskPickerProps {
  variant?: 'default' | 'mini-timer'
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
  variant = 'default',
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
}: TaskPickerProps) {
  const { t, language } = useI18n()
  const copy = taskPickerCopy[language]
  const reducedMotion = useReducedMotion()
  const backgroundId = useAppearanceStore(state => state.backgroundId)
  const searchRef = useRef<HTMLInputElement>(null)
  const allOptions = useTimerStore(state => state.taskOptions)
  const [expandedProjects, setExpandedProjects] = useState<string[]>([])
  const pickerId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState<{
    left: number
    top?: number
    bottom?: number
    width: number
    maxHeight: number
  } | null>(null)
  const isVisible = isOpen && !isDisabled

  const { loading, loadError, retry } = useQuickTasks(isVisible)
  const queryText = taskSearch.trim().toLocaleLowerCase()
  const matches = filteredTaskOptions.filter(task => !task.completed && !task.id.startsWith('temp_') && `${task.title} ${task.projectTitle ?? ''} ${task.description ?? ''}`.toLocaleLowerCase().includes(queryText))
  const projects = [...allOptions].sort(compareTaskActivity).filter(project => !project.parentId && !project.completed && (!queryText || matches.some(item => item.id === project.id || item.parentId === project.id)))
  const options = projects.flatMap(project => [project, ...(queryText || expandedProjects.includes(project.id) ? matches.filter(task => task.parentId === project.id).sort(compareTaskActivity) : [])])
  const query = taskSearch.trim()
  const exactMatch = options.find(task => task.title.toLocaleLowerCase() === query.toLocaleLowerCase())
  const close = () => { onClose(); triggerRef.current?.focus() }
  const select = (task: TaskOption | null) => {
    if (isDisabled || isTaskSelectionLocked(useTimerStore.getState().currentSession)) return
    onSelectTask(task)
    close()
  }
  useLayoutEffect(() => {
    if (!isVisible) return
    const ownerWindow = triggerRef.current?.ownerDocument.defaultView
    if (!ownerWindow) return

    const updatePosition = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const gap = 6
      const margin = 8
      const viewport = ownerWindow.visualViewport
      const viewportTop = viewport?.offsetTop ?? 0
      const viewportBottom = viewportTop + (viewport?.height ?? ownerWindow.innerHeight)
      const below = viewportBottom - rect.bottom - gap - margin
      const above = rect.top - viewportTop - gap - margin
      const openAbove = below < 256 && above > below
      const width = Math.min(rect.width, ownerWindow.innerWidth - margin * 2)
      setPosition({
        left: Math.max(margin, Math.min(rect.left, ownerWindow.innerWidth - width - margin)),
        ...(openAbove
          ? { bottom: ownerWindow.innerHeight - rect.top + gap }
          : { top: rect.bottom + gap }),
        width,
        maxHeight: Math.max(0, Math.min(380, openAbove ? above : below)),
      })
    }

    updatePosition()
    ownerWindow.visualViewport?.addEventListener('resize', updatePosition)
    ownerWindow.visualViewport?.addEventListener('scroll', updatePosition)
    ownerWindow.addEventListener('resize', updatePosition)
    ownerWindow.addEventListener('scroll', updatePosition, true)
    const observer = new ResizeObserver(updatePosition)
    if (triggerRef.current) observer.observe(triggerRef.current)
    return () => {
      ownerWindow.visualViewport?.removeEventListener('resize', updatePosition)
      ownerWindow.visualViewport?.removeEventListener('scroll', updatePosition)
      ownerWindow.removeEventListener('resize', updatePosition)
      ownerWindow.removeEventListener('scroll', updatePosition, true)
      observer.disconnect()
    }
  }, [isVisible, variant])

  return (
    <div className={variant === 'mini-timer' ? 'mini-timer-task-picker' : 'current-task-picker'} data-i18n-ignore>
      <div ref={taskPickerRef}>
        <button
          ref={triggerRef}
          id={pickerId}
          type="button"
          onClick={onToggle}
          onKeyDown={event => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              if (!isVisible) onToggle()
              else searchRef.current?.focus()
            }
            if (isVisible && event.key === 'Tab' && !event.shiftKey) {
              event.preventDefault(); searchRef.current?.focus()
            }
          }}
          disabled={isDisabled}
          aria-expanded={isVisible}
          aria-haspopup="dialog"
          aria-controls={isVisible ? `${pickerId}-options` : undefined}
          aria-label={`${copy.selection}: ${selectedTask?.projectTitle && selectedTask.parentId ? `${selectedTask.projectTitle} / ` : ''}${selectedTask?.title ?? copy.prompt}`}
          title={isDisabled ? copy.locked : selectedTask?.title}
          className={`current-task-trigger ${variant === 'mini-timer' ? 'mini-timer-task-trigger' : ''}`}
        >
          {!selectedTask && <Plus size={16} aria-hidden="true" />}
          <span style={projectColorStyle(allOptions.find(option => option.id === (selectedTask?.parentId ?? selectedTask?.id))?.color)}>{selectedTask?.parentId && selectedTask.projectTitle ? `${selectedTask.projectTitle} / ` : ''}{selectedTask?.title ?? copy.prompt}</span>
          <ChevronDown size={14} aria-hidden="true" className={isVisible ? 'rotate-180' : ''} />
        </button>

        {position && createPortal(
          <AnimatePresence>
            {isVisible && (
              <motion.div
                ref={taskDropdownRef}
                style={position}
                id={`${pickerId}-options`}
                role="dialog"
                aria-label={copy.selection}
                aria-busy={loading}
                data-i18n-ignore
                data-background-mode={variant !== 'mini-timer' && backgroundId !== 'default' || undefined}
                data-mini-timer-picker={variant === 'mini-timer' || undefined}
                initial={{ opacity: 0, y: reducedMotion ? 0 : -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reducedMotion ? 0 : -4 }}
                transition={{ duration: reducedMotion ? 0 : 0.15 }}
                className="task-popover"
                onBlur={event => {
                  if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node) && !taskPickerRef.current?.contains(event.relatedTarget as Node)) onClose()
                }}
                onKeyDown={event => {
                  if (event.nativeEvent.isComposing) return
                  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return }
                  if ((event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
                    event.preventDefault()
                    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)'))
                    const index = controls.indexOf(event.target as HTMLElement)
                    controls[(index + (event.key === 'ArrowDown' ? 1 : -1) + controls.length) % controls.length]?.focus()
                  }
                  if (event.key === 'Tab' && !event.shiftKey) {
                    const controls = event.currentTarget.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)')
                    if (event.target === controls[controls.length - 1]) { event.preventDefault(); close() }
                  }
                  if (event.key === 'Tab' && event.shiftKey && event.target === searchRef.current) { event.preventDefault(); close() }
                }}
              >
                <form noValidate className="task-search" onSubmit={event => {
                  event.preventDefault()
                  if (loading || loadError) return
                  if (exactMatch) select(exactMatch)
                  else if (options[0]) select(options[0])
                }}>
                  <input ref={searchRef} autoFocus value={taskSearch}
                    onChange={event => onTaskSearchChange(event.target.value)}
                    onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }}
                    aria-label={copy.search} placeholder={copy.search} />
                  {taskSearch && <button type="button" aria-label={copy.clear} onClick={() => { onTaskSearchChange(''); searchRef.current?.focus() }}><X size={16} /></button>}
                </form>
                <div className="task-popover-list">
                  {loading ? <p className="task-popover-message" role="status">{copy.loading}</p> : loadError ? (
                    <div className="task-popover-message" role="alert">{copy.loadError} <button type="button" onClick={retry}>{copy.retry}</button></div>
                  ) : <>
                    {projects.map(project => {
                      const children = options.filter(task => task.parentId === project.id)
                      const renderOption = (task: TaskOption) => (
                        <div className="task-option" key={task.id} data-project-task={Boolean(task.parentId)}>
                          <div className="task-option-row" data-selected={selectedTask?.id === task.id}>
                            {!task.parentId && <button type="button" className="task-option-disclosure" aria-label={`${copy.tasks}: ${task.title}`} aria-expanded={Boolean(queryText) || expandedProjects.includes(task.id)} onClick={() => setExpandedProjects(previous => previous.includes(task.id) ? previous.filter(id => id !== task.id) : [...previous, task.id])}><ChevronDown size={12} strokeWidth={1.5} aria-hidden="true" className={queryText || expandedProjects.includes(task.id) ? '' : '-rotate-90'} /></button>}
                            <button type="button" className="task-option-select" aria-label={task.parentId ? `${project.title} / ${task.title}` : task.title} aria-pressed={selectedTask?.id === task.id} onClick={() => select(task)}>
                              <span><span className="task-option-title" style={projectColorStyle(project.color)}>{task.title}</span></span>
                              {selectedTask?.id === task.id && <Check size={16} aria-hidden="true" />}
                            </button>
                          </div>
                        </div>
                      )
                      return (
                        <div className="task-project-group" key={project.id}>
                          {renderOption(project)}
                          {children.length > 0 && <div className="task-project-children" role="group" aria-label={project.title}>
                            {children.map(renderOption)}
                          </div>}
                        </div>
                      )
                    })}
                    {!options.length && !query && <p className="task-popover-message">{copy.empty}</p>}
                    {!options.length && query && <p className="task-popover-message">{t.timer.noMatchingTasks}</p>}
                  </>}
                </div>
                {selectedTask && <div className="task-popover-footer">
                  <button type="button" onClick={() => select(null)}>{copy.noTask}</button>
                </div>}
              </motion.div>
            )}
          </AnimatePresence>,
          triggerRef.current?.closest('[data-focus-stage]') ?? triggerRef.current?.ownerDocument.body ?? document.body
        )}
      </div>
    </div>
  )
})
