'use client'

import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTimerStore } from '@/store/useTimerStore'
import { useAuthStore } from '@/store/useAuthStore'
import NotificationToast from '@/components/NotificationToast'

interface Task {
  id: string
  backendId?: string
  title: string
  description: string
  pomodoros: number
  completedPomodoros: number
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  completed: boolean
  isPending?: boolean
}

const getTaskCanonicalId = (task: Task): string => task.backendId ?? task.id

const SELECTED_TASK_STORAGE_KEY = 'selectedTask'

const priorityColors = {
  'Critical': 'text-red-600',
  'High': 'text-orange-600',
  'Medium': 'text-green-600',
  'Low': 'text-blue-600',
}

export interface TaskListRef {
  refreshTasks: () => Promise<void>
}

const TaskList = forwardRef<TaskListRef>((props, ref) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('Medium')
  const [isLoading, setIsLoading] = useState(true)
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const { selectedTask, setSelectedTask, setTaskOptions, isRunning } = useTimerStore()
  const { user } = useAuthStore()
  const hasRestoredSelectedTask = useRef(false)
  const deleteConfirmTimeoutRef = useRef<number | null>(null)

  useImperativeHandle(ref, () => ({
    refreshTasks: loadTasks
  }))

  useEffect(() => {
    if (hasRestoredSelectedTask.current) {
      return
    }

    try {
      const storedSelection = localStorage.getItem(SELECTED_TASK_STORAGE_KEY)
      if (storedSelection) {
        const parsedSelection = JSON.parse(storedSelection)

        if (parsedSelection?.id) {
          setSelectedTask({
            id: parsedSelection.id,
            title: parsedSelection.title ?? '',
            description: parsedSelection.description ?? undefined,
          })
        }
      }
    } catch (error) {
      console.error('TaskList: Failed to restore selected task from storage:', error)
      localStorage.removeItem(SELECTED_TASK_STORAGE_KEY)
    } finally {
      hasRestoredSelectedTask.current = true
    }
  }, [setSelectedTask])

  useEffect(() => {
    if (!hasRestoredSelectedTask.current) {
      return
    }

    try {
      if (selectedTask) {
        localStorage.setItem(SELECTED_TASK_STORAGE_KEY, JSON.stringify(selectedTask))
      } else {
        localStorage.removeItem(SELECTED_TASK_STORAGE_KEY)
      }
    } catch (error) {
      console.error('TaskList: Failed to persist selected task to storage:', error)
    }
  }, [selectedTask])

  // Load tasks on mount
  useEffect(() => {
    if (user) {
      loadTasks()
    } else {
      setTasks([])
      setTaskOptions([])
      setSelectedTask(null)
      setIsLoading(false)
    }
  }, [user, setSelectedTask, setTaskOptions])

  useEffect(() => {
    setTaskOptions(tasks.map((task) => ({
      id: getTaskCanonicalId(task),
      title: task.title,
      description: task.description,
      completed: task.completed,
    })))
  }, [tasks, setTaskOptions])

  useEffect(() => {
    if (!selectedTask) {
      return
    }

    const matchingTask = tasks.find((task) => getTaskCanonicalId(task) === selectedTask.id)

    if (matchingTask) {
      const canonicalId = getTaskCanonicalId(matchingTask)
      const nextDescription = matchingTask.description ?? undefined

      if (
        selectedTask.id !== canonicalId ||
        selectedTask.title !== matchingTask.title ||
        (selectedTask.description ?? undefined) !== nextDescription
      ) {
        setSelectedTask({
          id: canonicalId,
          title: matchingTask.title,
          description: nextDescription,
        })
      }
      return
    }

    if (!isLoading) {
      setSelectedTask(null)
    }
  }, [tasks, selectedTask, setSelectedTask, isLoading])

  useEffect(() => () => {
    if (deleteConfirmTimeoutRef.current) {
      window.clearTimeout(deleteConfirmTimeoutRef.current)
      deleteConfirmTimeoutRef.current = null
    }
  }, [])

  const loadTasks = async () => {
    console.log('TaskList: Loading tasks...')
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.log('TaskList: No token found, skipping load')
        return
      }

      const response = await fetch('/api/tasks', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('TaskList: Received tasks from API:', data)
        const normalized: Task[] = data.map((task: any) => ({
          id: task.id,
          backendId: task.id,
          title: task.title,
          description: task.description ?? '',
          pomodoros: task.pomodoros ?? 1,
          completedPomodoros: task.completedPomodoros ?? 0,
          priority: task.priority ?? 'Medium',
          completed: task.completed ?? false,
          isPending: false,
        }))
        setTasks(normalized)
        console.log('TaskList: Tasks updated in state')
      } else {
        console.error('TaskList: Failed to load tasks, status:', response.status)
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const selectTask = (task: Task) => {
    if (isRunning) {
      return
    }

    const canonicalId = getTaskCanonicalId(task)

    if (selectedTask?.id === canonicalId) {
      setSelectedTask(null)
      return
    }

    setSelectedTask({
      id: canonicalId,
      title: task.title,
      description: task.description,
    })
  }

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    if (task.isPending) {
      return
    }

    const newCompleted = !task.completed
    setTasks(prev => prev.map(t => (
      t.id === id ? { ...t, completed: newCompleted } : t
    )))

    if (!task.backendId) {
      // While task is not synced with server, just update UI
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/tasks/${task.backendId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ completed: newCompleted })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle task')
      }
    } catch (error) {
      console.error('Failed to toggle task:', error)
      setTasks(prev => prev.map(t => (
        t.id === id ? { ...t, completed: !newCompleted } : t
      )))
    }
  }

  const deleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    const originalIndex = tasks.findIndex(t => t.id === id)

    if (selectedTask?.id === getTaskCanonicalId(task)) {
      setSelectedTask(null)
    }

    setTasks(prev => prev.filter(t => t.id !== id))

    if (!task.backendId) {
      // Task not yet synced, just delete locally
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/tasks/${task.backendId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
      setTasks(prev => {
        const restored = [...prev]
        restored.splice(originalIndex, 0, task)
        return restored
      })
    }
  }

  const requestDeleteTask = (id: string) => {
    if (pendingDeleteTaskId === id) {
      if (deleteConfirmTimeoutRef.current) {
        window.clearTimeout(deleteConfirmTimeoutRef.current)
        deleteConfirmTimeoutRef.current = null
      }
      setPendingDeleteTaskId(null)
      setShowToast(false)
      deleteTask(id)
      return
    }

    setPendingDeleteTaskId(id)
    setToastMessage('To delete, press again')
    setShowToast(true)

    if (deleteConfirmTimeoutRef.current) {
      window.clearTimeout(deleteConfirmTimeoutRef.current)
    }

    deleteConfirmTimeoutRef.current = window.setTimeout(() => {
      setPendingDeleteTaskId(null)
      setShowToast(false)
      deleteConfirmTimeoutRef.current = null
    }, 2500)
  }

  const dismissDeleteToast = () => {
    if (deleteConfirmTimeoutRef.current) {
      window.clearTimeout(deleteConfirmTimeoutRef.current)
      deleteConfirmTimeoutRef.current = null
    }
    setPendingDeleteTaskId(null)
    setShowToast(false)
  }

  const addTask = async () => {
    if (!newTaskTitle.trim()) return
    
    const tempId = `temp_${Date.now()}`
    const optimisticTask: Task = {
      id: tempId,
      title: newTaskTitle.trim(),
      description: '',
      pomodoros: 1,
      completedPomodoros: 0,
      priority: newTaskPriority,
      completed: false,
      isPending: true,
    }
    
    setTasks(prev => [...prev, optimisticTask])
    setNewTaskTitle('')
    setNewTaskPriority('Medium')

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Login to save tasks')
        setTasks(prev => prev.filter(t => t.id !== tempId))
        return
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: optimisticTask.title,
          description: optimisticTask.description,
          pomodoros: optimisticTask.pomodoros,
          priority: optimisticTask.priority
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      const createdTask = await response.json()
      setTasks(prev => prev.map(task => (
        task.id === tempId
          ? {
              ...task,
              backendId: createdTask.id,
              title: createdTask.title,
              description: createdTask.description ?? '',
              pomodoros: createdTask.pomodoros ?? 1,
              completedPomodoros: createdTask.completedPomodoros ?? 0,
              priority: createdTask.priority ?? optimisticTask.priority,
              completed: createdTask.completed ?? false,
              isPending: false,
            }
          : task
      )))
    } catch (error) {
      console.error('Failed to create task:', error)
      setTasks(prev => prev.filter(t => t.id !== tempId))
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTask()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm"
    >
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            My Tasks
          </h3>
          <button
            onClick={addTask}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors"
            aria-label="Add task"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-2">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Add new task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg pl-3 pr-24 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
            />
            <div className="absolute right-2 flex gap-1">
              <button
                onClick={() => setNewTaskPriority('Critical')}
                className={`w-5 h-5 rounded transition-all ${
                  newTaskPriority === 'Critical'
                    ? 'bg-red-500 ring-2 ring-red-300 dark:ring-red-700'
                    : 'bg-red-300 dark:bg-red-700 opacity-40 hover:opacity-70'
                }`}
                title="Critical"
              />
              <button
                onClick={() => setNewTaskPriority('High')}
                className={`w-5 h-5 rounded transition-all ${
                  newTaskPriority === 'High'
                    ? 'bg-orange-500 ring-2 ring-orange-300 dark:ring-orange-700'
                    : 'bg-orange-300 dark:bg-orange-700 opacity-40 hover:opacity-70'
                }`}
                title="High"
              />
              <button
                onClick={() => setNewTaskPriority('Medium')}
                className={`w-5 h-5 rounded transition-all ${
                  newTaskPriority === 'Medium'
                    ? 'bg-green-500 ring-2 ring-green-300 dark:ring-green-700'
                    : 'bg-green-300 dark:bg-green-700 opacity-40 hover:opacity-70'
                }`}
                title="Medium"
              />
              <button
                onClick={() => setNewTaskPriority('Low')}
                className={`w-5 h-5 rounded transition-all ${
                  newTaskPriority === 'Low'
                    ? 'bg-blue-500 ring-2 ring-blue-300 dark:ring-blue-700'
                    : 'bg-blue-300 dark:bg-blue-700 opacity-40 hover:opacity-70'
                }`}
                title="Low"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 animate-pulse">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 dark:bg-slate-600 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-1/2" />
                  </div>
                  <div className="w-5 h-5 bg-gray-200 dark:bg-slate-600 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-24" />
                  <div className="flex space-x-2">
                    <div className="w-6 h-6 bg-gray-200 dark:bg-slate-600 rounded" />
                    <div className="w-6 h-6 bg-gray-200 dark:bg-slate-600 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {tasks.map((task) => {
              const canonicalId = getTaskCanonicalId(task)
              const isActive = selectedTask?.id === canonicalId
              const isSelectionLocked = isRunning

              const hoverState = isActive
                ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : isSelectionLocked
                  ? ''
                  : 'hover:bg-gray-100 dark:hover:bg-slate-600'

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => selectTask(task)}
                  className={`bg-gray-50 dark:bg-slate-700 rounded-lg p-4 transition-colors ${
                    task.completed ? 'opacity-60' : ''
                  } ${hoverState} ${isSelectionLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <motion.div layout className="flex items-start space-x-3">
                    <button
                      disabled={task.isPending}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleTask(task.id)
                      }}
                      className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        task.completed
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300 dark:border-slate-500 hover:border-blue-500'
                      } ${task.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label={task.completed ? 'Uncheck' : 'Mark as completed'}
                    >
                      <svg
                        className={`w-3 h-3 text-white transition-opacity ${
                          task.completed ? 'opacity-100' : 'opacity-0'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`text-sm font-medium ${
                          task.completed
                            ? 'text-gray-500 dark:text-slate-400 line-through'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {task.title}
                        </div>
                        <div 
                          className={`w-2 h-2 rounded-full ${
                            task.priority === 'Critical' ? 'bg-red-500' :
                            task.priority === 'High' ? 'bg-orange-500' :
                            task.priority === 'Medium' ? 'bg-green-500' :
                            'bg-blue-500'
                          }`}
                          title={task.priority}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className={`flex items-center space-x-1 text-xs ${
                          task.completed
                            ? 'text-gray-400 dark:text-slate-500'
                            : 'text-gray-500 dark:text-slate-400'
                        }`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{task.completedPomodoros} {task.completedPomodoros === 1 ? 'pomodoro' : 'pomodoros'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={task.isPending}
                      onClick={(e) => {
                        e.stopPropagation()
                        requestDeleteTask(task.id)
                      }}
                      className={`text-gray-400 hover:text-red-500 transition-colors ${
                        task.isPending ? 'opacity-50 cursor-not-allowed hover:text-gray-400' : ''
                      }`}
                      aria-label="Delete task"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </motion.div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
        
        {!isLoading && tasks.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
            {user ? 'No tasks. Add a new task above.' : 'Login to manage tasks.'}
          </div>
        )}
      </div>

      <NotificationToast
        message={toastMessage}
        isVisible={showToast}
        onClose={dismissDeleteToast}
        type="warning"
        duration={2500}
      />
    </motion.div>
  )
})

TaskList.displayName = 'TaskList'

export default TaskList
