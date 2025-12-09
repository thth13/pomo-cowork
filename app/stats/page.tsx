'use client'

import { useCallback, useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore } from '@/store/useThemeStore'
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
  faTasks
} from '@fortawesome/free-solid-svg-icons'
import LatestActivity from '@/components/LatestActivity'

interface Stats {
  totalPomodoros: number
  totalFocusMinutes: number
  currentStreak: number
  avgMinutesPerDay: number
  focusTimeThisMonth: number
  weeklyActivity: Array<{ date: string; pomodoros: number }>
  yearlyHeatmap: Array<{ week: number; dayOfWeek: number; pomodoros: number; date: string }>
  monthlyBreakdown: Array<{ month: string; monthIndex: number; pomodoros: number }>
  lastSevenDaysTimeline: Array<{
    date: string
    dayLabel: string
    totalFocusMinutes: number
    totalPomodoros: number
    sessions: Array<{
      id: string
      type: string
      status: string
      task: string
      start: string
      end: string
      duration: number
    }>
  }>
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
  const { isAuthenticated, token, isLoading: authLoading } = useAuthStore()
  const { theme } = useThemeStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false)
  const [chartReady, setChartReady] = useState(false)
  const [activityPeriod, setActivityPeriod] = useState<'7' | '30' | '365'>('7')
  const [timelineOffset, setTimelineOffset] = useState(0)
  
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

  const fetchStats = useCallback(async (options?: { preservePage?: boolean }) => {
    const preservePage = options?.preservePage ?? false
    if (!token) {
      return
    }

    if (preservePage) {
      setTimelineLoading(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await fetch(`/api/stats?period=${activityPeriod}&timelineOffset=${timelineOffset}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        setHasFetchedOnce(true)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      if (preservePage) {
        setTimelineLoading(false)
      } else {
        setLoading(false)
      }
    }
  }, [token, activityPeriod, timelineOffset])

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (isAuthenticated && token) {
      fetchStats({ preservePage: hasFetchedOnce })
    } else if (!isAuthenticated) {
      setLoading(false)
    }
  }, [authLoading, fetchStats, isAuthenticated, token, hasFetchedOnce])

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
  const lastSevenDays = stats?.lastSevenDaysTimeline || []

  const getSessionColor = (type: string) => {
    switch (type) {
      case 'WORK':
        return 'bg-red-500'
      case 'SHORT_BREAK':
        return 'bg-emerald-500'
      case 'LONG_BREAK':
        return 'bg-blue-500'
      default:
        return 'bg-slate-500'
    }
  }

  const formatTimeRange = (start: string, end: string) => {
    const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
    const startStr = new Date(start).toLocaleTimeString('en-US', opts)
    const endStr = new Date(end).toLocaleTimeString('en-US', opts)
    return `${startStr} - ${endStr}`
  }

  const timeLabels = [0, 6, 12, 18, 24]

  const getTimelineRangeLabel = () => {
    if (!lastSevenDays.length) return ''
    const timestamps = lastSevenDays.map(day => new Date(day.date).getTime())
    const minDate = new Date(Math.min(...timestamps))
    const maxDate = new Date(Math.max(...timestamps))
    const formatOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    return `${minDate.toLocaleDateString('ru-RU', formatOpts)} — ${maxDate.toLocaleDateString('ru-RU', formatOpts)}`
  }

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <LatestActivity token={token} isAuthenticated={isAuthenticated} onChange={fetchStats} />

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 relative" aria-busy={timelineLoading}>
                {timelineLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl">
                    <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Last 7 Days</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Recent focus timelines</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setTimelineOffset(timelineOffset + 7)}
                      className="text-xs px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      aria-label="Previous week"
                    >
                      &lt;
                    </button>
                    <div className="text-xs font-medium text-gray-700 dark:text-slate-200 min-w-[130px] text-center">
                      {getTimelineRangeLabel() || '—'}
                    </div>
                    <button
                      type="button"
                      onClick={() => setTimelineOffset(Math.max(0, timelineOffset - 7))}
                      disabled={timelineOffset === 0}
                      className={`text-xs px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors ${
                        timelineOffset === 0
                          ? 'text-gray-400 dark:text-slate-500 cursor-not-allowed'
                          : 'text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                      aria-label="Next week"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {lastSevenDays.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-slate-400 text-center py-10">
                    No sessions for the last week yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {lastSevenDays.map(day => {
                      const workSessions = day.sessions.filter(session => session.type === 'WORK')
                      return (
                        <div key={day.date} className="flex items-center">
                          <div className="relative flex-1 h-8 rounded-lg border border-gray-100 dark:border-slate-700 bg-slate-900/5 dark:bg-slate-900 overflow-hidden">
                            <div className="pointer-events-none absolute inset-0">
                              {Array.from({ length: 25 }).map((_, idx) => {
                                // Пропускаем первую (0) и последнюю (24) линии
                                if (idx === 0 || idx === 24) return null
                                
                                const left = (idx / 24) * 100
                                const isMajor = idx % 6 === 0
                                return (
                                  <div
                                    key={idx}
                                    className={`absolute ${isMajor ? 'h-full bg-gray-300 dark:bg-slate-600' : 'h-1/2 top-1/4 bg-gray-200 dark:bg-slate-700'}`}
                                    style={{ width: '1px', left: `${left}%` }}
                                  />
                                )
                              })}
                            </div>

                            {workSessions.length > 0 &&
                              workSessions.map(session => {
                                const start = new Date(session.start)
                                const end = new Date(session.end)
                                const startMinutes = (start.getHours() * 60) + start.getMinutes()
                                const endMinutes = Math.min(1440, (end.getHours() * 60) + end.getMinutes())
                                const durationMinutes = Math.max(1, endMinutes - startMinutes || session.duration)
                                const left = Math.max(0, (startMinutes / 1440) * 100)
                                const width = Math.min(100 - left, (durationMinutes / 1440) * 100)
                                return (
                                  <div
                                    key={session.id}
                                    className={`absolute top-1/2 -translate-y-1/2 h-5 rounded-md ${getSessionColor(session.type)} shadow-sm`}
                                    style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
                                    title={`${formatTimeRange(session.start, session.end)} · ${session.task}`}
                                  >
                                    <span className="absolute inset-0 bg-white/10 dark:bg-slate-900/10 rounded-md" />
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="relative mt-2 h-5 text-[11px] text-gray-500 dark:text-slate-400">
                  {timeLabels.map((label, idx) => {
                    const left = (label / 24) * 100
                    const translateX = idx === 0 ? '0%' : idx === timeLabels.length - 1 ? '-100%' : '-50%'
                    return (
                      <span
                        key={label}
                        className="absolute top-0"
                        style={{ left: `${left}%`, transform: `translateX(${translateX})` }}
                      >
                        {String(label).padStart(2, '0')}:00
                      </span>
                    )
                  })}
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
