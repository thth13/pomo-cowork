'use client'

import { useCallback, useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore } from '@/store/useThemeStore'
import { PomodoroSession, SessionStatus, SessionType } from '@/types'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faClock, 
  faStopwatch, 
  faCalendarCheck, 
  faCalendarDays, 
  faFire, 
  faArrowUp, 
  faCalendar, 
  faBullseye, 
  faTasks,
  faMedal,
  faCrown,
  faRocket,
  faTrash,
  faPen,
  faEllipsisVertical
} from '@fortawesome/free-solid-svg-icons'

interface Stats {
  totalPomodoros: number
  totalFocusMinutes: number
  currentStreak: number
  avgMinutesPerDay: number
  focusTimeThisMonth: number
  weeklyActivity: Array<{ date: string; pomodoros: number }>
  yearlyHeatmap: Array<{ week: number; dayOfWeek: number; pomodoros: number; date: string }>
  monthlyBreakdown: Array<{ month: string; monthIndex: number; pomodoros: number }>
  productivityTrends: {
    bestTime: { start: string; end: string; efficiency: number }
    bestDay: { name: string; avgPomodoros: string }
    avgSessionDuration: number
    weeklyTasks: { completed: number; total: number }
  }
  taskStats: {
    total: number
    completed: number
    pending: number
    completionRate: number
    byPriority: {
      critical: number
      high: number
      medium: number
      low: number
    }
    topByPomodoros: Array<{
      id: string
      title: string
      completedPomodoros: number
      plannedPomodoros: number
      completed: boolean
      priority: string
    }>
    estimationAccuracy: number
    totalPlannedPomodoros: number
    totalCompletedPomodoros: number
  }
}

export default function StatsPage() {
  const { isAuthenticated, token } = useAuthStore()
  const { theme } = useThemeStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartReady, setChartReady] = useState(false)
  const [activityPeriod, setActivityPeriod] = useState<'7' | '30' | '365'>('7')
  const [timeEntries, setTimeEntries] = useState<PomodoroSession[]>([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [entriesPage, setEntriesPage] = useState(1)
  const [hasMoreEntries, setHasMoreEntries] = useState(false)
  const [loadingMoreEntries, setLoadingMoreEntries] = useState(false)
  const [totalEntries, setTotalEntries] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState<{
    task: string
    duration: number
    type: SessionType
    status: SessionStatus
    startTime: string
    endTime: string
  }>({
    task: '',
    duration: 0,
    type: SessionType.WORK,
    status: SessionStatus.ACTIVE,
    startTime: '',
    endTime: ''
  })
  const [editBaseDate, setEditBaseDate] = useState<string>('')
  const [openEntryMenuId, setOpenEntryMenuId] = useState<string | null>(null)
  
  const isDark = theme === 'dark'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Динамически загружаем heatmap модуль только на клиенте
      import('highcharts/modules/heatmap').then((module: any) => {
        const heatmapFactory = module.default || module
        if (typeof heatmapFactory === 'function') {
          heatmapFactory(Highcharts)
        }
        setChartReady(true)
      }).catch(err => {
        console.error('Failed to load heatmap module:', err)
        setChartReady(true) // Продолжаем работу даже если модуль не загрузился
      })
    }
  }, [])

  useEffect(() => {
    const closeMenu = () => setOpenEntryMenuId(null)
    document.addEventListener('click', closeMenu)
    return () => document.removeEventListener('click', closeMenu)
  }, [])

  const fetchStats = useCallback(async () => {
    if (!token) {
      return
    }

    try {
      const response = await fetch(`/api/stats?period=${activityPeriod}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }, [token, activityPeriod])

  const ENTRIES_PAGE_SIZE = 20

  const fetchTimeEntries = useCallback(async (page = 1, append = false) => {
    if (!token) {
      return
    }

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
  }, [token])

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchStats()
      fetchTimeEntries(1, false)
    } else if (!isAuthenticated) {
      setLoading(false)
      setEntriesLoading(false)
    }
  }, [fetchStats, fetchTimeEntries, isAuthenticated, token])

  const generateYearlyHeatmapData = () => {
    if (!stats?.yearlyHeatmap) return []
    
    return stats.yearlyHeatmap.map(item => [
      item.week,
      item.dayOfWeek,
      item.pomodoros
    ])
  }

  const weeklyChartOptions: Highcharts.Options = {
    chart: { type: 'column', backgroundColor: 'transparent' },
    title: { text: '' },
    credits: { enabled: false },
    xAxis: {
      categories: stats?.weeklyActivity?.map(item => {
        if (activityPeriod === '365') {
          // For year, show months (item.date format 'yyyy-MM')
          const [year, month] = item.date.split('-')
          const date = new Date(parseInt(year), parseInt(month) - 1, 1)
          return date.toLocaleDateString('en-US', { month: 'short' })
        } else {
          const date = new Date(item.date)
          if (activityPeriod === '7') {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            return days[date.getDay()]
          } else {
            return date.getDate().toString()
          }
        }
      }) || [],
      lineColor: isDark ? '#475569' : '#e5e7eb',
      tickColor: isDark ? '#475569' : '#e5e7eb',
      labels: {
        rotation: 0,
        step: activityPeriod === '30' ? 2 : 1,
        style: { color: isDark ? '#cbd5e1' : '#6b7280' }
      }
    },
    yAxis: {
      title: { 
        text: 'Pomodoros',
        style: { color: isDark ? '#cbd5e1' : '#6b7280' }
      },
      gridLineColor: isDark ? '#334155' : '#f3f4f6',
      labels: {
        style: { color: isDark ? '#cbd5e1' : '#6b7280' }
      }
    },
    legend: { enabled: false },
    plotOptions: {
      column: {
        borderRadius: 4,
        pointPadding: 0.1,
        groupPadding: 0.1
      }
    },
    series: [{
      type: 'column',
      name: 'Pomodoros',
      data: stats?.weeklyActivity?.map(s => s.pomodoros) || [],
      color: '#3b82f6'
    }]
  }

  const heatmapOptions: Highcharts.Options = {
    chart: { 
      type: 'heatmap', 
      backgroundColor: 'transparent',
      height: 140,
      spacing: [0, 0, 0, 0]
    },
    title: { text: '' },
    credits: { enabled: false },
    xAxis: {
      visible: false,
      min: 0,
      gridLineWidth: 0,
      lineWidth: 0
    },
    yAxis: {
      categories: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      title: { text: '' },
      reversed: true,
      labels: {
        style: { 
          fontSize: '10px',
          color: isDark ? '#cbd5e1' : '#6b7280'
        }
      },
      gridLineWidth: 0,
      lineWidth: 0
    },
    colorAxis: {
      min: 0,
      max: 10,
      stops: isDark ? [
        [0, '#334155'],
        [0.25, '#14532d'],
        [0.5, '#166534'],
        [0.75, '#15803d'],
        [1, '#22c55e']
      ] : [
        [0, '#ebedf0'],
        [0.25, '#c6e48b'],
        [0.5, '#7bc96f'],
        [0.75, '#239a3b'],
        [1, '#196127']
      ]
    },
    legend: { enabled: false },
    tooltip: {
      formatter: function() {
        const point = this as any
        // Find date from data
        const dataPoint = stats?.yearlyHeatmap?.find(
          item => item.week === point.x && item.dayOfWeek === point.y
        )
        const dateStr = dataPoint?.date || ''
        return '<b>' + point.value + '</b> pomodoros<br>' + 
               (dateStr ? new Date(dateStr).toLocaleDateString('en-US') : '')
      }
    },
    plotOptions: {
      heatmap: {
        borderWidth: 2,
        borderColor: isDark ? '#1e293b' : '#ffffff',
        dataLabels: { enabled: false }
      }
    },
    series: [{
      type: 'heatmap',
      name: 'Pomodoros',
      data: generateYearlyHeatmapData(),
      colsize: 1,
      rowsize: 1
    }]
  }

  const monthlyChartOptions: Highcharts.Options = {
    chart: { type: 'line', backgroundColor: 'transparent' },
    title: { text: '' },
    credits: { enabled: false },
    xAxis: {
      categories: stats?.monthlyBreakdown?.map(m => m.month) || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      lineColor: isDark ? '#475569' : '#e5e7eb',
      tickColor: isDark ? '#475569' : '#e5e7eb',
      labels: {
        style: { color: isDark ? '#cbd5e1' : '#6b7280' }
      }
    },
    yAxis: {
      title: { 
        text: 'Pomodoros',
        style: { color: isDark ? '#cbd5e1' : '#6b7280' }
      },
      gridLineColor: isDark ? '#334155' : '#f3f4f6',
      labels: {
        style: { color: isDark ? '#cbd5e1' : '#6b7280' }
      }
    },
    legend: { enabled: false },
    plotOptions: {
      line: {
        marker: {
          enabled: true,
          radius: 4
        },
        lineWidth: 3
      }
    },
    series: [{
      type: 'line',
      name: 'Pomodoros per Month',
      data: stats?.monthlyBreakdown?.map(m => m.pomodoros) || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      color: '#3b82f6'
    }]
  }

  const totalPomodoros = stats?.totalPomodoros || 0
  const totalHours = Math.floor((stats?.totalFocusMinutes || 0) / 60)
  const totalMinutesRemainder = (stats?.totalFocusMinutes || 0) % 60
  const currentStreak = stats?.currentStreak || 0
  const avgTimePerDay = stats?.avgMinutesPerDay || 0
  const focusTimeThisMonth = Math.floor((stats?.focusTimeThisMonth || 0) / 60)
  const focusTimeThisMonthMinutes = (stats?.focusTimeThisMonth || 0) % 60

  const dailyGoal = 8
  const todayPomodoros = stats?.weeklyActivity?.[stats.weeklyActivity.length - 1]?.pomodoros || 0
  const completed = todayPomodoros
  const progress = (completed / dailyGoal) * 100

  const progressDashoffset = 314.16 - (314.16 * progress) / 100

  const SkeletonCard = () => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
        <div className="h-4 w-12 bg-gray-200 dark:bg-slate-700 rounded"></div>
      </div>
      <div className="h-8 w-24 bg-gray-200 dark:bg-slate-700 rounded mb-2"></div>
      <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
    </div>
  )

  const SkeletonChart = () => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 animate-pulse">
      <div className="h-6 w-40 bg-gray-200 dark:bg-slate-700 rounded mb-6"></div>
      <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
    </div>
  )

  const getSessionTypeLabel = (type: SessionType) => {
    switch (type) {
      case SessionType.WORK:
        return 'Focus'
      case SessionType.SHORT_BREAK:
        return 'Short break'
      case SessionType.LONG_BREAK:
        return 'Long break'
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
    return new Date(value).toLocaleString('ru-RU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const pad = (n: number) => n.toString().padStart(2, '0')

  const formatDateOnly = (value: string) => {
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

  const handleStartChange = (value: string) => {
    setEditForm(prev => {
      const newStart = value
      let newEnd = prev.endTime
      let newDuration = prev.duration
      const durationFromInputs = calcDurationMinutes(newStart, prev.endTime, editBaseDate)
      if (durationFromInputs !== null) {
        newDuration = durationFromInputs
      } else if (prev.duration && newStart && prev.endTime) {
        newEnd = prev.endTime
      }

      if (prev.duration && newStart && !prev.endTime && editBaseDate) {
        const startDate = combineDateTime(editBaseDate, newStart)
        if (startDate) {
          const endDate = new Date(startDate.getTime() + prev.duration * 60000)
          newEnd = formatTimeOnly(endDate.toISOString())
        }
      }

      return { ...prev, startTime: newStart, endTime: newEnd, duration: newDuration }
    })
  }

  const handleEndChange = (value: string) => {
    setEditForm(prev => {
      const newEnd = value
      const durationFromInputs = calcDurationMinutes(prev.startTime, newEnd, editBaseDate)
      return {
        ...prev,
        endTime: newEnd,
        duration: durationFromInputs !== null ? durationFromInputs : prev.duration,
      }
    })
  }

  const handleDurationChange = (value: number) => {
    setEditForm(prev => {
      const newDuration = value
      let newEnd = prev.endTime
      if (editBaseDate && prev.startTime && newDuration > 0) {
        const startDate = combineDateTime(editBaseDate, prev.startTime)
        if (startDate) {
          const endDate = new Date(startDate.getTime() + newDuration * 60000)
          newEnd = formatTimeOnly(endDate.toISOString())
        }
      }
      return { ...prev, duration: newDuration, endTime: newEnd }
    })
  }

  const handleDeleteEntry = async (id: string) => {
    if (!token) return
    if (!window.confirm('Удалить эту запись времени?')) return

    setDeletingId(id)
    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setTimeEntries(prev => prev.filter(entry => entry.id !== id))
        setTotalEntries(prev => (prev !== null ? Math.max(prev - 1, 0) : prev))
        fetchStats()
      }
    } catch (error) {
      console.error('Failed to delete time entry:', error)
    } finally {
      setDeletingId(null)
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
        fetchStats()
        cancelEdit()
      }
    } catch (error) {
      console.error('Failed to update time entry:', error)
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Statistics</h1>
          <p className="text-gray-600 dark:text-slate-300">Track your productivity and progress</p>
        </div>

        {loading || !chartReady ? (
          <>
            {/* Skeleton Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>

            {/* Skeleton Chart */}
            <div className="mb-8">
              <SkeletonChart />
            </div>

            {/* Skeleton Heatmap */}
            <div className="mb-8">
              <SkeletonChart />
            </div>

            {/* Skeleton Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <SkeletonChart />
              <SkeletonChart />
            </div>
          </>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <FontAwesomeIcon icon={faClock} className="text-red-600 text-lg" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{totalPomodoros.toLocaleString()}</div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">Total Pomodoros</div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FontAwesomeIcon icon={faStopwatch} className="text-blue-600 text-lg" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{totalHours}h {totalMinutesRemainder}m</div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">Total Focus Time</div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <FontAwesomeIcon icon={faCalendarCheck} className="text-orange-600 text-lg" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{currentStreak}</div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">Current Streak</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">days in a row</div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <FontAwesomeIcon icon={faCalendarDays} className="text-purple-600 text-lg" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{avgTimePerDay}m</div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">Average Daily Time</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">On active days</div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <FontAwesomeIcon icon={faFire} className="text-green-600 text-lg" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{focusTimeThisMonth}h {focusTimeThisMonthMinutes}m</div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">Focus Time</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">This month</div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 flex flex-col max-h-[640px]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Latest activity</h3>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-slate-400">
                    {totalEntries ?? timeEntries.length} entries
                  </div>
                </div>

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
                                  <input
                                    type="text"
                                    value={editForm.task}
                                    onChange={e => setEditForm(prev => ({ ...prev, task: e.target.value }))}
                                    className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2 text-gray-900 dark:text-white"
                                    placeholder="Task"
                                  />
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
                                      {formatDateTime(entry.startedAt)} · {entry.duration} мин
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
                                            handleDeleteEntry(entry.id)
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
              </div>
            </div>

        {/* Weekly Chart */}
        <div className="mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {activityPeriod === '7' && 'Weekly Activity'}
                {activityPeriod === '30' && 'Monthly Activity'}
                {activityPeriod === '365' && 'Yearly Activity'}
              </h3>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setActivityPeriod('7')}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                    activityPeriod === '7' 
                      ? 'text-white bg-blue-500' 
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  7d
                </button>
                <button 
                  onClick={() => setActivityPeriod('30')}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                    activityPeriod === '30' 
                      ? 'text-white bg-blue-500' 
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  30d
                </button>
                <button 
                  onClick={() => setActivityPeriod('365')}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                    activityPeriod === '365' 
                      ? 'text-white bg-blue-500' 
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  Year
                </button>
              </div>
            </div>
            <HighchartsReact highcharts={Highcharts} options={weeklyChartOptions} />
          </div>
        </div>

        {/* Yearly Heatmap */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Yearly Activity Map</h3>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600 dark:text-slate-300">
                <span className="font-medium">{totalPomodoros.toLocaleString()}</span> pomodoros in {new Date().getFullYear()}
              </div>
              <select className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                <option>{new Date().getFullYear()}</option>
              </select>
            </div>
          </div>
          
          <HighchartsReact highcharts={Highcharts} options={heatmapOptions} />
          
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mt-4">
            <span>Less</span>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-100 dark:bg-slate-700 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-200 dark:bg-green-900 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-400 dark:bg-green-700 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-600 dark:bg-green-500 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-800 dark:bg-green-400 rounded-sm"></div>
            </div>
            <span>More</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-100 dark:border-slate-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stats?.weeklyActivity && stats.weeklyActivity.length > 0 
                  ? Math.max(...stats.weeklyActivity.map(w => w.pomodoros))
                  : 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-300">Best Day</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">Pomodoros</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stats?.yearlyHeatmap ? stats.yearlyHeatmap.filter(d => d.pomodoros > 0).length : 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-300">Active Days</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">This year</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{currentStreak}</div>
              <div className="text-sm text-gray-600 dark:text-slate-300">Current Streak</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">days in a row</div>
            </div>
          </div>
        </div>

        {/* Productivity Trends & Monthly Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Productivity Trends</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faArrowUp} className="text-green-600 dark:text-green-400 text-sm" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Best Time</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">
                      {stats?.productivityTrends?.bestTime?.start || '00:00'} - {stats?.productivityTrends?.bestTime?.end || '00:00'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{stats?.productivityTrends?.bestTime?.efficiency || 0}%</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">efficiency</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faCalendar} className="text-blue-600 dark:text-blue-400 text-sm" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Best Day</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">{stats?.productivityTrends?.bestDay?.name || 'No data'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{stats?.productivityTrends?.bestDay?.avgPomodoros || '0'}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">avg. pomodoros</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faBullseye} className="text-purple-600 dark:text-purple-400 text-sm" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Focus Mode</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">Average duration</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{stats?.productivityTrends?.avgSessionDuration || 0}m</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">per session</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faTasks} className="text-orange-600 dark:text-orange-400 text-sm" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Completed Tasks</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">This week</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{stats?.productivityTrends?.weeklyTasks?.completed || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">of {stats?.productivityTrends?.weeklyTasks?.total || 0}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Monthly Breakdown</h3>
            <HighchartsReact highcharts={Highcharts} options={monthlyChartOptions} />
          </div>
        </div>

            {/* Task Statistics */}

          </>
        )}

        {/* Achievements */}
        {/* <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6"
        >
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Achievements</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl text-center hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <FontAwesomeIcon icon={faMedal} className="text-yellow-600 dark:text-yellow-400 text-2xl" />
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">First Pomodoro</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">Unlocked</div>
            </div>

            <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl text-center hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <FontAwesomeIcon icon={faFire} className="text-orange-600 dark:text-orange-400 text-2xl" />
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">Week Streak</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">Unlocked</div>
            </div>

            <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl text-center hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <FontAwesomeIcon icon={faCrown} className="text-purple-600 dark:text-purple-400 text-2xl" />
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">1000 Pomodoros</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">Unlocked</div>
            </div>

            <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl text-center opacity-50">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <FontAwesomeIcon icon={faRocket} className="text-gray-400 dark:text-slate-500 text-2xl" />
              </div>
              <div className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">5000 Pomodoros</div>
              <div className="text-xs text-gray-400 dark:text-slate-500">{totalPomodoros}/5000</div>
            </div>
          </div>
        </motion.div> */}
      </main>
    </div>
  )
}
