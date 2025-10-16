'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { Calendar } from 'lucide-react'

interface Session {
  id: string
  task: string
  duration: number
  type: string
  status: string
  startedAt: string
  endedAt: string | null
  completedAt: string | null
}

export default function WorkHistory() {
  const { user } = useAuthStore()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchTodaySessions = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return

        const response = await fetch('/api/sessions/today', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setSessions(data)
        }
      } catch (error) {
        console.error('Failed to fetch today sessions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTodaySessions()

    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchTodaySessions, 30000)
    return () => clearInterval(interval)
  }, [user])

  const getSessionTypeLabel = (type: string): string => {
    switch (type) {
      case 'WORK':
        return 'Фокус'
      case 'SHORT_BREAK':
        return 'Короткий перерыв'
      case 'LONG_BREAK':
        return 'Длинный перерыв'
      default:
        return 'Фокус'
    }
  }

  const getSessionTypeColor = (type: string): string => {
    switch (type) {
      case 'WORK':
        return 'bg-red-500'
      case 'SHORT_BREAK':
        return 'bg-blue-500'
      case 'LONG_BREAK':
        return 'bg-green-500'
      default:
        return 'bg-red-500'
    }
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'COMPLETED':
        return 'Завершен'
      case 'CANCELLED':
        return 'Прерван'
      default:
        return 'Активен'
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-600'
      case 'CANCELLED':
        return 'bg-yellow-100 text-yellow-600'
      default:
        return 'bg-blue-100 text-blue-600'
    }
  }

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getTimeRange = (session: Session): string => {
    const start = formatTime(session.startedAt)
    const end = session.endedAt ? formatTime(session.endedAt) : '...'
    return `${start} - ${end}`
  }

  const getProductivityNote = (session: Session): string => {
    if (session.type === 'WORK') {
      if (session.status === 'COMPLETED') {
        const notes = [
          'Отличная продуктивность',
          'Хорошая концентрация',
          'Отличная работа'
        ]
        return notes[Math.floor(Math.random() * notes.length)]
      } else {
        return 'Внешние помехи'
      }
    } else {
      return 'Отдых'
    }
  }

  const calculateStats = () => {
    const workSessions = sessions.filter(s => s.type === 'WORK' && s.status === 'COMPLETED')
    const shortBreaks = sessions.filter(s => s.type === 'SHORT_BREAK' && s.status === 'COMPLETED')
    const longBreaks = sessions.filter(s => s.type === 'LONG_BREAK' && s.status === 'COMPLETED')

    return {
      work: workSessions.length,
      shortBreak: shortBreaks.length,
      longBreak: longBreaks.length
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-slate-700/50 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const stats = calculateStats()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700">
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">История работы</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-400">
            <Calendar size={16} />
            <span>Сегодня</span>
          </div>
        </div>
        <div className="flex items-center space-x-6 mt-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-sm text-gray-600 dark:text-slate-400">{stats.work} фокус</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-sm text-gray-600 dark:text-slate-400">{stats.shortBreak} перерыва</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-sm text-gray-600 dark:text-slate-400">{stats.longBreak} длинный</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
            Сегодня еще нет завершенных сессий
          </div>
        ) : (
          sessions.map(session => (
            <div key={session.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 ${getSessionTypeColor(session.type)} rounded-full`} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {getSessionTypeLabel(session.type)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(session.status)}`}>
                    {getStatusLabel(session.status)}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {getTimeRange(session)}
                </span>
              </div>
              {session.type === 'WORK' && (
                <div className="text-sm text-gray-600 dark:text-slate-300 mb-1">{session.task}</div>
              )}
              <div className="text-xs text-gray-500 dark:text-slate-400">
                {session.duration} минут • {getProductivityNote(session)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
