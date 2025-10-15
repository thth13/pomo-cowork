'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Task {
  id: string
  title: string
  description: string
  pomodoros: number
  priority: 'Критичный' | 'Высокий' | 'Средний' | 'Низкий'
  completed: boolean
}

const priorityColors = {
  'Критичный': 'text-red-600',
  'Высокий': 'text-orange-600',
  'Средний': 'text-green-600',
  'Низкий': 'text-blue-600',
}

const initialTasks: Task[] = [
  {
    id: '1',
    title: 'Разработать API эндпоинты',
    description: 'Создать REST API для мобильного приложения',
    pomodoros: 2,
    priority: 'Высокий',
    completed: false,
  },
  {
    id: '2',
    title: 'Написать техническое задание',
    description: 'Подготовить ТЗ для новой функции',
    pomodoros: 1,
    priority: 'Средний',
    completed: true,
  },
  {
    id: '3',
    title: 'Провести код-ревью',
    description: 'Проверить pull request от команды',
    pomodoros: 1,
    priority: 'Средний',
    completed: false,
  },
  {
    id: '4',
    title: 'Обновить документацию',
    description: 'Добавить описание новых функций',
    pomodoros: 1,
    priority: 'Низкий',
    completed: false,
  },
  {
    id: '5',
    title: 'Подготовить презентацию',
    description: 'Создать слайды для встречи с клиентом',
    pomodoros: 3,
    priority: 'Критичный',
    completed: false,
  },
]

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id))
  }

  const addTask = () => {
    if (!newTaskTitle.trim()) return
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      description: '',
      pomodoros: 1,
      priority: 'Средний',
      completed: false,
    }
    
    setTasks([...tasks, newTask])
    setNewTaskTitle('')
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
        
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Добавить новую задачу..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
          />
        </div>
      </div>

      {/* Task List */}
      <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
        <AnimatePresence>
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`bg-gray-50 dark:bg-slate-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors ${
                task.completed ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    task.completed
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-slate-500 hover:border-blue-500'
                  }`}
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
                  
                  <div className="flex items-center space-x-4">
                    <div className={`flex items-center space-x-1 text-xs ${
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
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Удалить задачу"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
            Нет задач. Добавьте новую задачу выше.
          </div>
        )}
      </div>
    </motion.div>
  )
}
