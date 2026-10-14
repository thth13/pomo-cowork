'use client'

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
  const loadedRevision = useRef<number | null>(null)

  useEffect(() => {
    loadedRevision.current = null
    setLoadError(false)
  }, [token])

  useEffect(() => {
    if (!isOpen || loadedRevision.current === revision) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    const requestGeneration = ++generation.current
    setLoading(true)
    setLoadError(false)
    setError(false)
    taskService.list(controller.signal).then(tasks => {
      if (!controller.signal.aborted && requestGeneration === generation.current && token === useAuthStore.getState().token) {
        useTimerStore.getState().setTaskOptions(tasks)
        // An empty list is also a successful load; reopening needs no request.
        loadedRevision.current = revision
      }
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError(true)
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [isOpen, token, revision])

  useEffect(() => {
    // Invalidate while closed too, so the next opening sees changes.
    const refresh = () => setRevision(value => value + 1)
    window.addEventListener(TASK_CHANGED_EVENT, refresh)
    window.addEventListener('session-completed', refresh)
    return () => {
      window.removeEventListener(TASK_CHANGED_EVENT, refresh)
      window.removeEventListener('session-completed', refresh)
    }
  }, [])

  const mutate = useCallback(async (operation: () => Promise<TaskChange>) => {
    if (pending.current) return null
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
      const options = store.taskOptions.filter(task => task.id !== id && ('task' in change || task.parentId !== id))
      if ('task' in change) options.unshift({ ...previous, ...change.task })
      store.setTaskOptions(options)
      window.dispatchEvent(new CustomEvent<TaskChange>(TASK_CHANGED_EVENT, { detail: change }))
      setRevision(value => value + 1)
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
