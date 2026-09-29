'use client'

import { isTaskSelectionLocked } from '@/lib/taskSelection'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useTimerStore } from '@/store/useTimerStore'
import { taskService, TaskRecord } from '@/services/taskService'

export const TASK_CHANGED_EVENT = 'pomo:task-changed'
export type TaskChange = { task: TaskRecord } | { deletedId: string }

export function useQuickTasks(isOpen: boolean) {
  const token = useAuthStore(state => state.token)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  const pending = useRef(false)
  const generation = useRef(0)

  useEffect(() => {
    if (!isOpen) return
    const controller = new AbortController()
    const requestGeneration = ++generation.current
    setLoading(true)
    setLoadError(false)
    setError(false)
    taskService.list(controller.signal).then(tasks => {
      if (!controller.signal.aborted && requestGeneration === generation.current) useTimerStore.getState().setTaskOptions(tasks)
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError(true)
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [isOpen, token, revision])

  const mutate = useCallback(async (operation: () => Promise<TaskChange>) => {
    if (pending.current || isTaskSelectionLocked(useTimerStore.getState().currentSession)) return null
    pending.current = true
    setSaving(true)
    setError(false)
    const ownerToken = useAuthStore.getState().token
    try {
      const change = await operation()
      if (ownerToken !== useAuthStore.getState().token) return null
      generation.current++
      const store = useTimerStore.getState()
      const id = 'task' in change ? change.task.id : change.deletedId
      const previous = store.taskOptions.find(task => task.id === id)
      const options = store.taskOptions.filter(task => task.id !== id)
      if ('task' in change) options.unshift({ ...previous, ...change.task })
      store.setTaskOptions(options)
      if (!isTaskSelectionLocked(store.currentSession) && store.selectedTask?.id === id) {
        store.setSelectedTask('task' in change && !change.task.completed ? change.task : null)
      }
      window.dispatchEvent(new CustomEvent<TaskChange>(TASK_CHANGED_EVENT, { detail: change }))
      return change
    } catch {
      setError(true)
      return null
    } finally {
      pending.current = false
      setSaving(false)
    }
  }, [])

  return { loading, loadError, saving, error, mutate, retry: () => setRevision(value => value + 1) }
}
