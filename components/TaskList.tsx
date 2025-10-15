'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTimerStore } from '@/store/useTimerStore'
import { useAuthStore } from '@/store/useAuthStore'

interface Task {
  id: string
  backendId?: string
  title: string
  description: string
  pomodoros: number
  priority: 'Критичный' | 'Высокий' | 'Средний' | 'Низкий'
  completed: boolean
  isPending?: boolean
}

const priorityColors = {
  'Критичный': 'text-red-600',
  'Высокий': 'text-orange-600',
  'Средний': 'text-green-600',
  'Низкий': 'text-blue-600',
}

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'Критичный' | 'Высокий' | 'Средний' | 'Низкий'>('Средний')
  const [isLoading, setIsLoading] = useState(true)
  const { selectedTask, setSelectedTask } = useTimerStore()
  const { user } = useAuthStore()

  // Загрузка задач при монтировании
  useEffect(() => {
    if (user) {
      loadTasks()
    } else {
      setIsLoading(false)
    }
  }, [user])

  const loadTasks = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/tasks', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const normalized: Task[] = data.map((task: any) => ({
          id: task.id,
          backendId: task.id,
          title: task.title,
          description: task.description ?? '',
          pomodoros: task.pomodoros ?? 1,
          priority: task.priority ?? 'Средний',
          completed: task.completed ?? false,
          isPending: false,
        }))
        setTasks(normalized)
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const selectTask = (task: Task) => {
    if (selectedTask?.id === task.id) {
      setSelectedTask(null)
    } else {
      setSelectedTask({
        id: task.id,
        title: task.title,
        description: task.description,
      })
    }
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
      // Пока задача не синхронизирована с сервером, просто обновляем UI
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

    if (selectedTask?.id === id) {
      setSelectedTask(null)
    }

    setTasks(prev => prev.filter(t => t.id !== id))

    if (!task.backendId) {
      // Задача ещё не синхронизирована, достаточно удалить локально
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

  const addTask = async () => {
    if (!newTaskTitle.trim()) return
    
    const tempId = `temp_${Date.now()}`
    const optimisticTask: Task = {
      id: tempId,
      title: newTaskTitle.trim(),
      description: '',
      pomodoros: 1,
      priority: newTaskPriority,
      completed: false,
      isPending: true,
    }
    
    setTasks(prev => [...prev, optimisticTask])
    setNewTaskTitle('')
    setNewTaskPriority('Средний')

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Войдите в аккаунт для сохранения задач')
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
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Мои задачи
          </h3>
          <button
            onClick={addTask}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors"
            aria-label="Добавить задачу"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Добавить новую задачу..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
          />
          
          {/* <div className="flex flex-col space-y-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">Приоритет:</span>
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={() => setNewTaskPriority('Критичный')}
                className={`px-2 py-1 text-xs rounded-md transition-colors whitespace-nowrap ${
                  newTaskPriority === 'Критичный'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30'
                }`}
              >
                Критичный
              </button>
              <button
                onClick={() => setNewTaskPriority('Высокий')}
                className={`px-2 py-1 text-xs rounded-md transition-colors whitespace-nowrap ${
                  newTaskPriority === 'Высокий'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                }`}
              >
                Высокий
              </button>
              <button
                onClick={() => setNewTaskPriority('Средний')}
                className={`px-2 py-1 text-xs rounded-md transition-colors whitespace-nowrap ${
                  newTaskPriority === 'Средний'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30'
                }`}
              >
                Средний
              </button>
              <button
                onClick={() => setNewTaskPriority('Низкий')}
                className={`px-2 py-1 text-xs rounded-md transition-colors whitespace-nowrap ${
                  newTaskPriority === 'Низкий'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                }`}
              >
                Низкий
              </button>
            </div>
          </div> */}
        </div>
      </div>

      {/* Task List */}
      <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
            Загрузка задач...
          </div>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {tasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              onClick={() => selectTask(task)}
              className={`bg-gray-50 dark:bg-slate-700 rounded-lg p-4 transition-colors cursor-pointer ${
                task.completed ? 'opacity-60' : ''
              } ${
                selectedTask?.id === task.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'hover:bg-gray-100 dark:hover:bg-slate-600'
              }`}
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
                  aria-label={task.completed ? 'Отменить выполнение' : 'Отметить как выполненное'}
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
                  <div className={`text-sm font-medium mb-1 ${
                    task.completed
                      ? 'text-gray-500 dark:text-slate-400 line-through'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {task.title}
                  </div>
                  
                  {task.description && (
                    <div className={`text-xs mb-2 ${
                      task.completed
                        ? 'text-gray-400 dark:text-slate-500'
                        : 'text-gray-500 dark:text-slate-400'
                    }`}>
                      {task.description}
                    </div>
                  )}
{/* 
                  {task.isPending && (
                    <div className="text-xs text-blue-500 dark:text-blue-400 mb-2 flex items-center space-x-1">
                      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                        <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      <span>Сохраняется...</span>
                    </div>
                  )} */}
                  
                  <div className="flex items-center space-x-4">
                    {/* <div className={`flex items-center space-x-1 text-xs ${
                      task.completed
                        ? 'text-gray-400 dark:text-slate-500'
                        : 'text-gray-500 dark:text-slate-400'
                    }`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{task.pomodoros} помодоро</span>
                    </div>
                    
                    <div className={`flex items-center space-x-1 text-xs ${priorityColors[task.priority]}`}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
                      </svg>
                      <span>{task.priority}</span>
                    </div> */}
                  </div>
                </div>
                
                <button
                  disabled={task.isPending}
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteTask(task.id)
                  }}
                  className={`text-gray-400 hover:text-red-500 transition-colors ${
                    task.isPending ? 'opacity-50 cursor-not-allowed hover:text-gray-400' : ''
                  }`}
                  aria-label="Удалить задачу"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </motion.div>
            </motion.div>
            ))}
          </AnimatePresence>
        )}
        
        {!isLoading && tasks.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
            {user ? 'Нет задач. Добавьте новую задачу выше.' : 'Войдите в аккаунт для управления задачами.'}
          </div>
        )}
      </div>
    </motion.div>
  )
}
