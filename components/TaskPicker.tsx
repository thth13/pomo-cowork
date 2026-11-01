'use client'

import { compareTaskActivity } from '@/lib/taskActivity'

import { isTaskSelectionLocked } from '@/lib/taskSelection'

import { RefObject, memo, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronDown, Loader2, Plus, X } from 'lucide-react'
import { taskService } from '@/services/taskService'
import { taskPickerCopy } from '@/lib/i18n/taskPicker'
import { gardenCopy } from '@/lib/i18n/garden'
import { useQuickTasks } from '@/hooks/useQuickTasks'
import { useAppearanceStore } from '@/store/useAppearanceStore'
import { useTimerStore } from '@/store/useTimerStore'
import { SessionType } from '@/types'
import { projectColorStyle } from '@/lib/projectColors'
import { TaskOption } from '@/types/task'
import { useI18n } from '@/components/I18nProvider'

// Keep the search implementation available for a future return.
const SHOW_PROJECT_SEARCH = false
const PICKER_CONTROLS = 'input:not(:disabled), button:not(:disabled), a[href]'

interface TaskPickerProps {
  variant?: 'default' | 'mini-timer' | 'daily-flow'
  unavailableTaskIds?: string[]
  triggerLabel?: string
  unavailableLabel?: string
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
  unavailableTaskIds = [],
  triggerLabel,
  unavailableLabel,
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
  const router = useRouter()
  const copy = taskPickerCopy[language]
  const reducedMotion = useReducedMotion()
  const backgroundId = useAppearanceStore(state => state.backgroundId)
  const searchRef = useRef<HTMLInputElement>(null)
  const allOptions = useTimerStore(state => state.taskOptions)
  const [expandedProjects, setExpandedProjects] = useState<string[]>([])
  const [taskDrafts, setTaskDrafts] = useState<Record<string, string>>({})
  const [creatingProject, setCreatingProject] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdNotice, setCreatedNotice] = useState('')
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null)
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

  const { loading, loadError, saving, mutate, retry } = useQuickTasks(isVisible)
  const tasksOnly = variant === 'daily-flow'
  const queryText = taskSearch.trim().toLocaleLowerCase()
  const matches = filteredTaskOptions.filter(task => !task.completed && !task.id.startsWith('temp_') && `${task.title} ${task.projectTitle ?? ''} ${task.description ?? ''}`.toLocaleLowerCase().includes(queryText))
  const projects = [...allOptions].sort(compareTaskActivity).filter(project => !project.parentId && !project.completed && !project.id.startsWith('temp_') && (!queryText || matches.some(item => item.id === project.id || item.parentId === project.id)))
  const options = projects.flatMap(project => [project, ...(queryText || expandedProjects.includes(project.id) ? matches.filter(task => task.parentId === project.id).sort(compareTaskActivity) : [])])
  const query = taskSearch.trim()
  const exactMatch = options.find(task => task.title.toLocaleLowerCase() === query.toLocaleLowerCase())
  const close = () => { setCreatedTaskId(null); onClose(); triggerRef.current?.focus() }
  const focusFirstControl = () => {
    const dropdown = taskDropdownRef.current
    const target = dropdown?.querySelector<HTMLElement>(PICKER_CONTROLS) ?? dropdown
    target?.focus()
  }
  const openProjects = () => {
    close()
    const handled = !window.dispatchEvent(new Event('pomo:open-projects', { cancelable: true }))
    if (!handled) router.push('/?panel=tasks')
    if (variant === 'mini-timer') window.focus()
  }
  const select = (task: TaskOption | null) => {
    if (tasksOnly && !task?.parentId) return
    if (isDisabled || (task && unavailableTaskIds.includes(task.id)) || (variant !== 'daily-flow' && isTaskSelectionLocked(useTimerStore.getState().currentSession))) return
    onSelectTask(task)
    close()
  }
  const createTask = async (projectId: string) => {
    const title = taskDrafts[projectId]?.trim()
    if (!title || saving || loading || loadError || isDisabled) return
    if (!useTimerStore.getState().taskOptions.some(project => project.id === projectId && !project.parentId && !project.completed)) return
    setCreatingProject(projectId)
    setCreateError(null)
    setCreatedNotice('')
    const result = await mutate(async () => ({ task: await taskService.create({ title, parentId: projectId }) }))
    if (result) {
      setTaskDrafts(previous => ({ ...previous, [projectId]: '' }))
      setCreatedNotice(copy.createdTask)
      if ('task' in result) setCreatedTaskId(result.task.id)
    } else setCreateError(projectId)
    setCreatingProject(null)
  }
  useLayoutEffect(() => {
    if (!isVisible || loading || !createdTaskId) return
    taskDropdownRef.current?.ownerDocument.getElementById(`${pickerId}-task-${createdTaskId}`)?.focus()
  }, [isVisible, loading, createdTaskId, pickerId, taskDropdownRef])
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
          data-beep-tour={variant === 'default' ? 'task-picker' : undefined}
          id={pickerId}
          type="button"
          onClick={onToggle}
          onKeyDown={event => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              if (!isVisible) onToggle()
              else focusFirstControl()
            }
            if (isVisible && event.key === 'Tab' && !event.shiftKey) {
              event.preventDefault(); focusFirstControl()
            }
          }}
          disabled={isDisabled}
          aria-expanded={isVisible}
          aria-haspopup="dialog"
          aria-controls={isVisible ? `${pickerId}-options` : undefined}
          aria-label={triggerLabel ?? `${copy.selection}: ${selectedTask?.projectTitle && selectedTask.parentId ? `${selectedTask.projectTitle} / ` : ''}${selectedTask?.title ?? copy.prompt}`}
          title={isDisabled && variant !== 'daily-flow' ? copy.locked : selectedTask?.title}
          className={`current-task-trigger ${variant === 'mini-timer' ? 'mini-timer-task-trigger' : ''}`}
        >
          <span>{selectedTask?.parentId && selectedTask.projectTitle ? <><span style={projectColorStyle(allOptions.find(option => option.id === selectedTask.parentId)?.color)}>{selectedTask.projectTitle}</span>{' / '}</> : null}<span style={selectedTask && !selectedTask.parentId ? projectColorStyle(selectedTask.color) : undefined}>{triggerLabel ?? selectedTask?.title ?? copy.prompt}</span></span>
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
                tabIndex={-1}
                aria-label={triggerLabel ?? copy.selection}
                aria-busy={loading}
                data-i18n-ignore
                data-background-mode={variant !== 'mini-timer' && backgroundId !== 'default' || undefined}
                data-mini-timer-picker={variant === 'mini-timer' || undefined}
                data-daily-flow-picker={variant === 'daily-flow' || undefined}
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
                    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(PICKER_CONTROLS))
                    const index = controls.indexOf(event.target as HTMLElement)
                    controls[(index + (event.key === 'ArrowDown' ? 1 : -1) + controls.length) % controls.length]?.focus()
                  }
                  if (event.key === 'Tab' && !event.shiftKey) {
                    const controls = event.currentTarget.querySelectorAll<HTMLElement>(PICKER_CONTROLS)
                    if (event.target === controls[controls.length - 1]) { event.preventDefault(); close() }
                  }
                  if (event.key === 'Tab' && event.shiftKey && (event.target === event.currentTarget || event.target === event.currentTarget.querySelector(PICKER_CONTROLS))) { event.preventDefault(); close() }
                }}
              >
                <form noValidate hidden={!SHOW_PROJECT_SEARCH} style={SHOW_PROJECT_SEARCH ? undefined : { display: 'none' }} className="task-search" onSubmit={event => {
                  event.preventDefault()
                  if (loading || loadError) return
                  if (exactMatch) select(exactMatch)
                  else if (options[0]) select(options[0])
                }}>
                  <input ref={searchRef} disabled={!SHOW_PROJECT_SEARCH} autoFocus={SHOW_PROJECT_SEARCH} value={taskSearch}
                    onChange={event => onTaskSearchChange(event.target.value)}
                    onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }}
                    aria-label={copy.search} placeholder={copy.search} />
                  {taskSearch && <button type="button" disabled={!SHOW_PROJECT_SEARCH} aria-label={copy.clear} onClick={() => { onTaskSearchChange(''); searchRef.current?.focus() }}><X size={16} /></button>}
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
                            <button id={`${pickerId}-task-${task.id}`} type="button" className="task-option-select" disabled={unavailableTaskIds.includes(task.id)} title={unavailableTaskIds.includes(task.id) ? unavailableLabel : undefined} aria-label={`${task.parentId ? `${project.title} / ${task.title}` : task.title}${unavailableTaskIds.includes(task.id) && unavailableLabel ? `: ${unavailableLabel}` : ''}`} aria-pressed={selectedTask?.id === task.id} onClick={() => select(task)}>
                              <span><span className="task-option-title" style={!task.parentId ? projectColorStyle(project.color) : undefined}>{task.title}</span></span>
                              {(selectedTask?.id === task.id || unavailableTaskIds.includes(task.id)) && <Check size={16} aria-hidden="true" />}
                            </button>
                          </div>
                        </div>
                      )
                      return (
                        <div className="task-project-group" key={project.id}>
                          {tasksOnly ? <button type="button" className="task-option-select flow-project-disclosure"
                            aria-expanded={Boolean(queryText) || expandedProjects.includes(project.id)}
                            onClick={() => setExpandedProjects(previous => previous.includes(project.id) ? previous.filter(id => id !== project.id) : [...previous, project.id])}>
                            <ChevronDown size={14} aria-hidden="true" className={queryText || expandedProjects.includes(project.id) ? '' : '-rotate-90'} />
                            <span className="task-option-title" style={projectColorStyle(project.color)}>{project.title}</span>
                          </button> : renderOption(project)}
                          {(children.length > 0 || (tasksOnly && (Boolean(queryText) || expandedProjects.includes(project.id)))) && <div className="task-project-children" role="group" aria-label={project.title}>
                            {children.map(renderOption)}
                            {tasksOnly && <form className="flow-project-task-form" noValidate onSubmit={event => { event.preventDefault(); void createTask(project.id) }}>
                              <label className="sr-only" htmlFor={`${pickerId}-${project.id}-new-task`}>{copy.newTask}: {project.title}</label>
                              <div className="flow-project-task-entry">
                                <input id={`${pickerId}-${project.id}-new-task`} type="text" maxLength={500}
                                  value={taskDrafts[project.id] ?? ''} placeholder={copy.newTask} disabled={saving}
                                  aria-invalid={createError === project.id}
                                  aria-describedby={createError === project.id ? `${pickerId}-${project.id}-error` : undefined}
                                  onChange={event => { setTaskDrafts(previous => ({ ...previous, [project.id]: event.target.value })); setCreateError(null) }}
                                  onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }} />
                                <button type="submit" disabled={saving || !taskDrafts[project.id]?.trim()} aria-busy={creatingProject === project.id}>
                                  {creatingProject === project.id ? <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}{copy.addTask}
                                </button>
                              </div>
                              {createError === project.id && <p id={`${pickerId}-${project.id}-error`} role="alert">{copy.error}</p>}
                            </form>}
                          </div>}
                        </div>
                      )
                    })}
                    {!options.length && !query && <p className="task-popover-message">{copy.empty}{' '}<a href="/?panel=tasks" className="underline underline-offset-2 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" onClick={event => {
                      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                      event.preventDefault()
                      openProjects()
                    }}>{gardenCopy[language].tasks}</a>.</p>}
                    {!options.length && query && <p className="task-popover-message">{t.timer.noMatchingTasks}</p>}
                  </>}
                </div>
                {tasksOnly && <p className="flow-project-task-status" role="status">{createdNotice}</p>}
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
