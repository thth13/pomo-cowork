'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEllipsisVertical, faPen, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import ConfirmModal from '@/components/ConfirmModal'
import { PomodoroSession, SessionStatus, SessionType } from '@/types'
import { TaskOption } from '@/types/task'

type LatestActivityProps = {
  token: string | null
  isAuthenticated: boolean
  onChange?: () => void
}

type EntryFormState = {
  task: string
  duration: number
  type: SessionType
  status: SessionStatus
  startTime: string
  endTime: string
}

const ENTRIES_PAGE_SIZE = 20

export default function LatestActivity({ token, isAuthenticated, onChange }: LatestActivityProps) {
  const [timeEntries, setTimeEntries] = useState<PomodoroSession[]>([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [entriesPage, setEntriesPage] = useState(1)
  const [hasMoreEntries, setHasMoreEntries] = useState(false)
  const [loadingMoreEntries, setLoadingMoreEntries] = useState(false)
  const [totalEntries, setTotalEntries] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasks, setTasks] = useState<TaskOption[]>([])
  const [showNewEntry, setShowNewEntry] = useState(false)
  const [creatingEntry, setCreatingEntry] = useState(false)
  const [newEntryBaseDate, setNewEntryBaseDate] = useState<string>(() =>
    formatDateOnly(new Date().toISOString())
  )
  const [newEntryForm, setNewEntryForm] = useState<EntryFormState>({
    task: '',
    duration: 25,
    type: SessionType.WORK,
    status: SessionStatus.COMPLETED,
    startTime: '',
    endTime: ''
  })
  const [editBaseDate, setEditBaseDate] = useState<string>('')
  const [openEntryMenuId, setOpenEntryMenuId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EntryFormState>({
    task: '',
    duration: 0,
    type: SessionType.WORK,
    status: SessionStatus.ACTIVE,
    startTime: '',
    endTime: ''
  })

  useEffect(() => {
    const closeMenu = () => setOpenEntryMenuId(null)
    document.addEventListener('click', closeMenu)
    return () => document.removeEventListener('click', closeMenu)
  }, [])

  const fetchTimeEntries = useCallback(
    async (page = 1, append = false) => {
      if (!token) return

      if (append) {
        setLoadingMoreEntries(true)
      } else {
        setEntriesLoading(true)
      }

      try {
        const response = await fetch(`/api/sessions?page=${page}&limit=${ENTRIES_PAGE_SIZE}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          const totalHeader = response.headers.get('X-Total-Count')
          const total = totalHeader ? parseInt(totalHeader, 10) : null
          const dataLength = Array.isArray(data) ? data.length : 0
          setTotalEntries(total)

          setTimeEntries(prev => {
            const combined = append ? [...prev, ...data] : data
            const hasMore = total !== null
              ? combined.length < total
              : dataLength === ENTRIES_PAGE_SIZE
            setHasMoreEntries(hasMore)
            return combined
          })

          setEntriesPage(page)
        }
      } catch (error) {
        console.error('Failed to fetch time entries:', error)
      } finally {
        setEntriesLoading(false)
        setLoadingMoreEntries(false)
      }
    },
    [token]
  )

  const fetchTasks = useCallback(async () => {
    if (!token) return
    setTasksLoading(true)
    try {
      const response = await fetch('/api/tasks', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(
          Array.isArray(data)
            ? data.map((task: any) => ({
                id: task.id,
                title: task.title,
                description: task.description,
              }))
            : []
        )
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setTasksLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchTimeEntries(1, false)
      fetchTasks()
    } else if (!isAuthenticated) {
      setEntriesLoading(false)
    }
  }, [fetchTasks, fetchTimeEntries, isAuthenticated, token])

  const getSessionTypeLabel = (type: SessionType) => {
    switch (type) {
      case SessionType.WORK:
        return 'Focus'
      case SessionType.SHORT_BREAK:
        return 'Short break'
      case SessionType.LONG_BREAK:
        return 'Long break'
      case SessionType.TIME_TRACKING:
        return 'Time tracking'
      default:
        return type
    }
  }

  const getSessionBadge = (type: SessionType) => {
    switch (type) {
      case SessionType.WORK:
        return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
      case SessionType.SHORT_BREAK:
        return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200'
      case SessionType.LONG_BREAK:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
      case SessionType.TIME_TRACKING:
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200'
    }
  }

  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case SessionStatus.COMPLETED:
        return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200'
      case SessionStatus.CANCELLED:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200'
      case SessionStatus.ACTIVE:
      case SessionStatus.PAUSED:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200'
    }
  }

  const formatDateTime = (value?: string) => {
    if (!value) return '—'
    return new Date(value).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  function pad(n: number) {
    return n.toString().padStart(2, '0')
  }

  function formatDateOnly(value: string) {
    const d = new Date(value)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  const formatTimeOnly = (value?: string) => {
    if (!value) return ''
    const d = new Date(value)
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const combineDateTime = (date: string, time: string) => {
    if (!date || !time) return null
    return new Date(`${date}T${time}`)
  }

  const calcDurationMinutes = (start: string, end: string, date: string) => {
    if (!start || !end || !date) return null
    const startDate = combineDateTime(date, start)
    const endDate = combineDateTime(date, end)
    if (!startDate || !endDate) return null
    const diff = endDate.getTime() - startDate.getTime()
    if (diff <= 0) return null
    return Math.round(diff / 60000)
  }

  const applyStartChange = (value: string, baseDate: string, form: EntryFormState) => {
    const newStart = value
    let newEnd = form.endTime
    let newDuration = form.duration
    const durationFromInputs = calcDurationMinutes(newStart, form.endTime, baseDate)
    if (durationFromInputs !== null) {
      newDuration = durationFromInputs
    } else if (form.duration && newStart && form.endTime) {
      newEnd = form.endTime
    }

    if (form.duration && newStart && !form.endTime && baseDate) {
      const startDate = combineDateTime(baseDate, newStart)
      if (startDate) {
        const endDate = new Date(startDate.getTime() + form.duration * 60000)
        newEnd = formatTimeOnly(endDate.toISOString())
      }
    }

    return { ...form, startTime: newStart, endTime: newEnd, duration: newDuration }
  }

  const applyEndChange = (value: string, baseDate: string, form: EntryFormState) => {
    const newEnd = value
    const durationFromInputs = calcDurationMinutes(form.startTime, newEnd, baseDate)
    return {
      ...form,
      endTime: newEnd,
      duration: durationFromInputs !== null ? durationFromInputs : form.duration,
    }
  }

  const applyDurationChange = (value: number, baseDate: string, form: EntryFormState) => {
    const newDuration = value
    let newEnd = form.endTime
    if (baseDate && form.startTime && newDuration > 0) {
      const startDate = combineDateTime(baseDate, form.startTime)
      if (startDate) {
        const endDate = new Date(startDate.getTime() + newDuration * 60000)
        newEnd = formatTimeOnly(endDate.toISOString())
      }
    }
    return { ...form, duration: newDuration, endTime: newEnd }
  }

  const handleStartChange = (value: string) => {
    setEditForm(prev => applyStartChange(value, editBaseDate, prev))
  }

  const handleEndChange = (value: string) => {
    setEditForm(prev => applyEndChange(value, editBaseDate, prev))
  }

  const handleDurationChange = (value: number) => {
    setEditForm(prev => applyDurationChange(value, editBaseDate, prev))
  }

  const handleNewStartChange = (value: string) => {
    setNewEntryForm(prev => applyStartChange(value, newEntryBaseDate, prev))
  }

  const handleNewEndChange = (value: string) => {
    setNewEntryForm(prev => applyEndChange(value, newEntryBaseDate, prev))
  }

  const handleNewDurationChange = (value: number) => {
    setNewEntryForm(prev => applyDurationChange(value, newEntryBaseDate, prev))
  }

  const handleDeleteEntry = async () => {
    if (!token || !confirmingId) return

    setDeletingId(confirmingId)
    try {
      const response = await fetch(`/api/sessions/${confirmingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setTimeEntries(prev => prev.filter(entry => entry.id !== confirmingId))
        setTotalEntries(prev => (prev !== null ? Math.max(prev - 1, 0) : prev))
        onChange?.()
      }
    } catch (error) {
      console.error('Failed to delete time entry:', error)
    } finally {
      setDeletingId(null)
      setConfirmingId(null)
    }
  }

  const startEditEntry = (entry: PomodoroSession) => {
    setEditingId(entry.id)
    let endValue = entry.completedAt || entry.endedAt
    let baseDate = entry.startedAt ? formatDateOnly(entry.startedAt) : ''
    if (!endValue && entry.startedAt && entry.duration) {
      const startDate = new Date(entry.startedAt)
      const endDate = new Date(startDate.getTime() + entry.duration * 60000)
      endValue = endDate.toISOString()
      baseDate = formatDateOnly(entry.startedAt)
    }
    if (!baseDate) {
      const now = new Date()
      baseDate = formatDateOnly(now.toISOString())
    }
    setEditBaseDate(baseDate)
    setEditForm({
      task: entry.task || '',
      duration: entry.duration,
      type: entry.type,
      status: entry.status,
      startTime: formatTimeOnly(entry.startedAt),
      endTime: formatTimeOnly(endValue),
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setSavingEdit(false)
    setOpenEntryMenuId(null)
  }

  const resetNewEntryForm = () => {
    const today = formatDateOnly(new Date().toISOString())
    setNewEntryBaseDate(today)
    setNewEntryForm({
      task: '',
      duration: 25,
      type: SessionType.WORK,
      status: SessionStatus.COMPLETED,
      startTime: '',
      endTime: '',
    })
  }

  const handleCreateEntry = async () => {
    if (!token || !newEntryForm.task.trim() || !newEntryForm.duration || !newEntryBaseDate || !newEntryForm.startTime) {
      return
    }
    setCreatingEntry(true)

    const startedAt =
      newEntryBaseDate && newEntryForm.startTime
        ? combineDateTime(newEntryBaseDate, newEntryForm.startTime)?.toISOString()
        : undefined

    let endedAt =
      newEntryBaseDate && newEntryForm.endTime
        ? combineDateTime(newEntryBaseDate, newEntryForm.endTime)?.toISOString()
        : undefined

    if (!endedAt && startedAt && newEntryForm.duration) {
      const startDate = new Date(startedAt)
      endedAt = new Date(startDate.getTime() + newEntryForm.duration * 60000).toISOString()
    }

    try {
      const createResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          task: newEntryForm.task.trim(),
          duration: Number(newEntryForm.duration),
          type: newEntryForm.type,
        }),
      })

      if (!createResponse.ok) {
        throw new Error('Failed to create session')
      }

      const created = await createResponse.json()

      const updatePayload: Record<string, any> = {
        task: newEntryForm.task.trim(),
        duration: Number(newEntryForm.duration),
        type: newEntryForm.type,
        status: newEntryForm.status,
      }

      if (startedAt) {
        updatePayload.startedAt = startedAt
      }
      if (endedAt) {
        updatePayload.endedAt = endedAt
      }
      updatePayload.completedAt =
        newEntryForm.status === SessionStatus.COMPLETED && endedAt ? endedAt : null

      let finalSession = created

      const updateResponse = await fetch(`/api/sessions/${created.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatePayload),
      })

      if (updateResponse.ok) {
        finalSession = await updateResponse.json()
      }

      const nextTotal = totalEntries !== null ? totalEntries + 1 : null

      setTimeEntries(prev => {
        const updated = [finalSession, ...prev]
        if (nextTotal !== null) {
          setHasMoreEntries(updated.length < nextTotal)
        }
        return updated
      })
      setTotalEntries(nextTotal)
      onChange?.()
      resetNewEntryForm()
      setShowNewEntry(false)
    } catch (error) {
      console.error('Failed to create time entry:', error)
    } finally {
      setCreatingEntry(false)
    }
  }

  const handleSaveEntry = async () => {
    if (!editingId || !token) return
    setSavingEdit(true)

    try {
      const response = await fetch(`/api/sessions/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          task: editForm.task,
          duration: Number(editForm.duration),
          type: editForm.type,
          status: editForm.status,
          startedAt: editBaseDate && editForm.startTime
            ? combineDateTime(editBaseDate, editForm.startTime)?.toISOString()
            : undefined,
          endedAt: editBaseDate && editForm.endTime
            ? combineDateTime(editBaseDate, editForm.endTime)?.toISOString()
            : undefined,
          completedAt:
            editForm.status === SessionStatus.COMPLETED && editBaseDate && editForm.endTime
              ? combineDateTime(editBaseDate, editForm.endTime)?.toISOString()
              : undefined,
        }),
      })

      if (response.ok) {
        const updated = await response.json()
        setTimeEntries(prev =>
          prev.map(entry => (entry.id === updated.id ? { ...entry, ...updated } : entry))
        )
        onChange?.()
        cancelEdit()
      }
    } catch (error) {
      console.error('Failed to update time entry:', error)
    } finally {
      setSavingEdit(false)
    }
  }

  const taskSelectOptions = useMemo(() => {
    const options = tasks || []
    const hasCurrent =
      editForm.task &&
      options.every(option => option.title !== editForm.task)
    if (hasCurrent) {
      return [{ id: 'current', title: editForm.task }, ...options]
    }
    return options
  }, [tasks, editForm.task])

  const canCreateNewEntry = Boolean(
    token &&
    newEntryForm.task.trim() &&
    newEntryForm.duration > 0 &&
    newEntryBaseDate &&
    newEntryForm.startTime
  )

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 flex flex-col max-h-[480px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Latest activity</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500 dark:text-slate-400">
            {totalEntries ?? timeEntries.length} entries
          </div>
          {isAuthenticated && (
            <button
              onClick={() => {
                setShowNewEntry(prev => {
                  if (prev) {
                    resetNewEntryForm()
                  }
                  return !prev
                })
              }}
              aria-label={showNewEntry ? 'Close add activity form' : 'Add activity'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} className={`h-4 w-4 transition-transform ${showNewEntry ? 'rotate-45' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {showNewEntry && (
        <div className="mb-4 space-y-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/40 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <input
                type="text"
                value={newEntryForm.task}
                onChange={e => setNewEntryForm(prev => ({ ...prev, task: e.target.value }))}
                list="latest-activity-tasks"
                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2 text-gray-900 dark:text-white"
                placeholder="Task name"
                autoComplete="off"
              />
              <datalist id="latest-activity-tasks">
                {tasks.map(task => (
                  <option key={task.id} value={task.title} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={1}
                value={newEntryForm.duration}
                onChange={e => handleNewDurationChange(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2 text-gray-900 dark:text-white"
                placeholder="Minutes"
              />
              <select
                value={newEntryForm.type}
                onChange={e => setNewEntryForm(prev => ({ ...prev, type: e.target.value as SessionType }))}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2 text-gray-900 dark:text-white"
              >
                <option value={SessionType.WORK}>Focus</option>
                <option value={SessionType.SHORT_BREAK}>Short break</option>
                <option value={SessionType.LONG_BREAK}>Long break</option>
                <option value={SessionType.TIME_TRACKING}>Time tracking</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="date"
              value={newEntryBaseDate}
              onChange={e => setNewEntryBaseDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2 text-gray-900 dark:text-white"
            />
            <input
              type="time"
              value={newEntryForm.startTime}
              onChange={e => handleNewStartChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2 text-gray-900 dark:text-white"
            />
            <input
              type="time"
              value={newEntryForm.endTime}
              onChange={e => handleNewEndChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <select
              value={newEntryForm.status}
              onChange={e => setNewEntryForm(prev => ({ ...prev, status: e.target.value as SessionStatus }))}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2 text-gray-900 dark:text-white"
            >
              <option value={SessionStatus.ACTIVE}>Active</option>
              <option value={SessionStatus.PAUSED}>Paused</option>
              <option value={SessionStatus.COMPLETED}>Completed</option>
              <option value={SessionStatus.CANCELLED}>Cancelled</option>
            </select>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => {
                  resetNewEntryForm()
                  setShowNewEntry(false)
                }}
                disabled={creatingEntry}
                className="px-3 py-2 text-xs font-medium text-gray-600 dark:text-slate-300 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEntry}
                disabled={!canCreateNewEntry || creatingEntry}
                className="px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60"
              >
                {creatingEntry ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-4">
        {entriesLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center justify-between bg-gray-50 dark:bg-slate-700/40 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3">
                <div className="flex items-center space-x-3">
                  <div className="w-20 h-5 bg-gray-200 dark:bg-slate-600 rounded-full" />
                  <div className="w-32 h-4 bg-gray-200 dark:bg-slate-600 rounded" />
                </div>
                <div className="w-16 h-4 bg-gray-200 dark:bg-slate-600 rounded" />
              </div>
            ))}
          </div>
        ) : timeEntries.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-slate-400">
            Нет записей времени
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {timeEntries.map(entry => (
                <div key={entry.id} className="py-2">
                  {editingId === entry.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <select
                            value={editForm.task}
                            onChange={e => setEditForm(prev => ({ ...prev, task: e.target.value }))}
                            disabled={tasksLoading || taskSelectOptions.length === 0}
                            className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2 text-gray-900 dark:text-white disabled:opacity-60"
                          >
                            {tasksLoading ? (
                              <option value="">Loading tasks...</option>
                            ) : taskSelectOptions.length === 0 ? (
                              <option value="">No tasks available</option>
                            ) : (
                              <>
                                {taskSelectOptions.map(task => (
                                  <option key={task.id} value={task.title}>
                                    {task.id === 'current' ? `${task.title} (current)` : task.title}
                                  </option>
                                ))}
                              </>
                            )}
                          </select>
                          {!tasksLoading && taskSelectOptions.length === 0 && (
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              Add a task on the main page to pick it here.
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min={1}
                            value={editForm.duration}
                            onChange={e => handleDurationChange(Number(e.target.value))}
                            className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2 text-gray-900 dark:text-white"
                            placeholder="Minutes"
                          />
                          <select
                            value={editForm.type}
                            onChange={e => setEditForm(prev => ({ ...prev, type: e.target.value as SessionType }))}
                            className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2 text-gray-900 dark:text-white"
                          >
                            <option value={SessionType.WORK}>Focus</option>
                            <option value={SessionType.SHORT_BREAK}>Short break</option>
                            <option value={SessionType.LONG_BREAK}>Long break</option>
                            <option value={SessionType.TIME_TRACKING}>Time tracking</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="time"
                          value={editForm.startTime}
                          onChange={e => handleStartChange(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2 text-gray-900 dark:text-white"
                        />
                        <input
                          type="time"
                          value={editForm.endTime}
                          onChange={e => handleEndChange(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <select
                          value={editForm.status}
                          onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value as SessionStatus }))}
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2 text-gray-900 dark:text-white"
                        >
                          <option value={SessionStatus.ACTIVE}>Active</option>
                          <option value={SessionStatus.PAUSED}>Paused</option>
                          <option value={SessionStatus.COMPLETED}>Completed</option>
                          <option value={SessionStatus.CANCELLED}>Cancelled</option>
                        </select>
                        <div className="flex items-center space-x-2 justify-end">
                          <button
                            onClick={cancelEdit}
                            disabled={savingEdit}
                            className="px-3 py-2 text-xs font-medium text-gray-600 dark:text-slate-300 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-60"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveEntry}
                            disabled={savingEdit}
                            className="px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60"
                          >
                            {savingEdit ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="flex items-start space-x-3 flex-1">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${getSessionBadge(entry.type)}`}>
                          {getSessionTypeLabel(entry.type)}
                        </span>
                        <div className="space-y-0.5">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {entry.task || 'Без названия'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">
                            {formatDateTime(entry.startedAt)} · {entry.duration} min
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusBadge(entry.status)}`}>
                          {entry.status === SessionStatus.COMPLETED && 'Completed'}
                          {entry.status === SessionStatus.CANCELLED && 'Cancelled'}
                          {entry.status === SessionStatus.ACTIVE && 'Active'}
                          {entry.status === SessionStatus.PAUSED && 'Paused'}
                        </span>
                        <div className="relative">
                          <button
                            onClick={e => {
                              e.preventDefault()
                              e.stopPropagation()
                              const nativeEvent = e.nativeEvent as MouseEvent
                              nativeEvent.stopImmediatePropagation?.()
                              setOpenEntryMenuId(prev => prev === entry.id ? null : entry.id)
                            }}
                            aria-label="Entry actions"
                            className="inline-flex items-center justify-center h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white"
                          >
                            <FontAwesomeIcon icon={faEllipsisVertical} className="h-4 w-4" />
                          </button>
                          {openEntryMenuId === entry.id && (
                            <div
                              onClick={e => {
                                e.stopPropagation()
                                const nativeEvent = e.nativeEvent as MouseEvent
                                nativeEvent.stopImmediatePropagation?.()
                              }}
                              className="absolute right-0 mt-2 w-36 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg z-10 py-1"
                            >
                              <button
                                onClick={e => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  const nativeEvent = e.nativeEvent as MouseEvent
                                  nativeEvent.stopImmediatePropagation?.()
                                  setOpenEntryMenuId(null)
                                  startEditEntry(entry)
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
                              >
                                <FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                onClick={e => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  const nativeEvent = e.nativeEvent as MouseEvent
                                  nativeEvent.stopImmediatePropagation?.()
                                  setOpenEntryMenuId(null)
                                  setConfirmingId(entry.id)
                                }}
                                disabled={deletingId === entry.id}
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {hasMoreEntries && (
              <div className="pt-4">
                <button
                  onClick={() => fetchTimeEntries(entriesPage + 1, true)}
                  disabled={loadingMoreEntries}
                  className="w-full text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60 disabled:cursor-not-allowed border border-blue-100 dark:border-blue-900/40 rounded-xl py-2"
                >
                  {loadingMoreEntries ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={Boolean(confirmingId)}
        title="Delete entry?"
        description="This session will be removed from history and chat."
        cancelLabel="Cancel"
        confirmLabel="Delete"
        loadingLabel="Deleting..."
        loading={deletingId === confirmingId}
        onCancel={() => setConfirmingId(null)}
        onConfirm={handleDeleteEntry}
      />
    </div>
  )
}
