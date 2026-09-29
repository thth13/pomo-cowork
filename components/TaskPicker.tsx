'use client'

import { RefObject, memo, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronDown, MoreHorizontal, Plus, X } from 'lucide-react'
import { taskPickerCopy } from '@/lib/i18n/taskPicker'
import { useQuickTasks } from '@/hooks/useQuickTasks'
import { taskService } from '@/services/taskService'
import { useAppearanceStore } from '@/store/useAppearanceStore'
import { useTimerStore } from '@/store/useTimerStore'
import { SessionType } from '@/types'
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
}: TaskPickerProps) {
  const { t, language } = useI18n()
  const copy = taskPickerCopy[language]
  const reducedMotion = useReducedMotion()
  const backgroundId = useAppearanceStore(state => state.backgroundId)
  const searchRef = useRef<HTMLInputElement>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [editing, setEditing] = useState<'rename' | 'delete' | null>(null)
  const [name, setName] = useState('')
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

  const { loading, loadError, saving, error, mutate, retry } = useQuickTasks(isVisible)
  const options = filteredTaskOptions.filter(task => !task.completed && !task.id.startsWith('temp_') && `${task.title} ${task.description ?? ''}`.toLocaleLowerCase().includes(taskSearch.trim().toLocaleLowerCase()))
  const query = taskSearch.trim()
  const exactMatch = options.find(task => task.title.toLocaleLowerCase() === query.toLocaleLowerCase())
  const canCreate = Boolean(query && !exactMatch && !loading && !loadError)

  useEffect(() => {
    if (!isVisible) { setActionId(null); setEditing(null) }
  }, [isVisible])

  const close = () => { onClose(); triggerRef.current?.focus() }
  const select = (task: TaskOption | null) => {
    if (saving || useTimerStore.getState().currentSession) return
    onSelectTask(task)
    close()
  }
  const create = async () => {
    if (!canCreate) return
    const result = await mutate(async () => ({ task: await taskService.create({ title: query }) }))
    if (result && 'task' in result && !useTimerStore.getState().currentSession) { onSelectTask(result.task); close() }
  }
  const update = async (task: TaskOption, action: 'rename' | 'complete' | 'delete') => {
    const result = await mutate(async () => action === 'delete'
      ? (await taskService.remove(task.id), { deletedId: task.id })
      : { task: await taskService.update(task.id, action === 'rename' ? { title: name.trim() } : { completed: true }) })
    if (result) { setActionId(null); setEditing(null); searchRef.current?.focus() }
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

  if (sessionType !== SessionType.WORK && sessionType !== SessionType.TIME_TRACKING) {
    return null
  }

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
          aria-label={`${t.timer.currentTask}: ${selectedTask?.title ?? copy.prompt}`}
          title={isDisabled ? copy.locked : selectedTask?.title}
          className={`current-task-trigger ${variant === 'mini-timer' ? 'mini-timer-task-trigger' : ''}`}
        >
          {!selectedTask && <Plus size={16} aria-hidden="true" />}
          <span>{selectedTask?.title ?? copy.prompt}</span>
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
                aria-label={t.timer.currentTask}
                aria-busy={loading || saving}
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
                  if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !((event.target as HTMLElement).tagName === 'INPUT' && editing)) {
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
                  if (loading || loadError || saving) return
                  if (exactMatch) select(exactMatch)
                  else if (canCreate) void create()
                  else if (options[0]) select(options[0])
                }}>
                  <input ref={searchRef} autoFocus value={taskSearch} disabled={saving}
                    onChange={event => { onTaskSearchChange(event.target.value); setActionId(null); setEditing(null) }}
                    onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }}
                    aria-label={copy.search} placeholder={copy.search} />
                  {taskSearch && <button type="button" disabled={saving} aria-label={copy.clear} onClick={() => { onTaskSearchChange(''); searchRef.current?.focus() }}><X size={16} /></button>}
                </form>
                <div className="task-popover-list">
                  {loading ? <p className="task-popover-message" role="status">{copy.loading}</p> : loadError ? (
                    <div className="task-popover-message" role="alert">{copy.loadError} <button type="button" onClick={retry}>{copy.retry}</button></div>
                  ) : <>
                    {options.map(task => (
                      <div className="task-option" key={task.id}>
                        <div className="task-option-row" data-selected={selectedTask?.id === task.id}>
                          <button type="button" className="task-option-select" disabled={saving} aria-pressed={selectedTask?.id === task.id} onClick={() => select(task)}>
                            <span><span className="task-option-title">{task.title}</span>
                              {Boolean(task.focusMinutes) && <small>{task.focusMinutes} {copy.minutes}</small>}
                            </span>
                            {selectedTask?.id === task.id && <Check size={16} aria-hidden="true" />}
                          </button>
                          <button type="button" className="task-option-more" disabled={saving} aria-label={`${copy.more}: ${task.title}`} aria-expanded={actionId === task.id}
                            onClick={() => { setActionId(actionId === task.id ? null : task.id); setEditing(null); setName(task.title) }}><MoreHorizontal size={18} /></button>
                        </div>
                        {actionId === task.id && <div className="task-inline-actions">
                          {editing === 'rename' ? <form noValidate onSubmit={event => { event.preventDefault(); if (name.trim()) void update(task, 'rename') }}>
                            <input autoFocus aria-label={copy.name} value={name} disabled={saving} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }} />
                            <div><button type="button" disabled={saving} onClick={() => { setEditing(null); searchRef.current?.focus() }}>{copy.cancel}</button><button type="submit" disabled={saving || !name.trim()}>{copy.save}</button></div>
                          </form> : editing === 'delete' ? <>
                            <p>{copy.deleteHint}</p>
                            <button type="button" autoFocus disabled={saving} onClick={() => { setEditing(null); searchRef.current?.focus() }}>{copy.cancel}</button>
                            <button type="button" className="task-delete" disabled={saving} onClick={() => void update(task, 'delete')}>{copy.delete}</button>
                          </> : <>
                            <button type="button" disabled={saving} onClick={() => setEditing('rename')}>{copy.rename}</button>
                            <button type="button" disabled={saving} onClick={() => void update(task, 'complete')}>{copy.complete}</button>
                            <button type="button" className="task-delete" disabled={saving} onClick={() => setEditing('delete')}>{copy.delete}</button>
                          </>}
                        </div>}
                      </div>
                    ))}
                    {!options.length && !query && <p className="task-popover-message">{copy.empty}</p>}
                    {!options.length && query && <p className="task-popover-message">{t.timer.noMatchingTasks}</p>}
                  </>}
                </div>
                <div className="task-popover-footer">
                  <button type="button" disabled={saving || loading || loadError} onClick={() => canCreate ? void create() : searchRef.current?.focus()}>
                    <Plus size={16} /><span>{canCreate ? `${copy.create} “${query}”` : copy.add}</span>
                  </button>
                  {selectedTask && <button type="button" disabled={saving} onClick={() => select(null)}>{copy.noTask}</button>}
                </div>
                {saving && <p className="task-popover-message" role="status">{copy.saving}</p>}
                {error && <p className="task-popover-message task-delete" role="alert">{copy.error}</p>}
              </motion.div>
            )}
          </AnimatePresence>,
          triggerRef.current?.ownerDocument.body ?? document.body
        )}
      </div>
    </div>
  )
})
