'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore } from '@/store/useThemeStore'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import heatmapModule from 'highcharts/modules/heatmap'
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
  faRocket
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
}

let isHeatmapInitialized = false

export default function StatsPage() {
  const { isAuthenticated, token } = useAuthStore()
  const { theme } = useThemeStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartReady, setChartReady] = useState(false)
  const [activityPeriod, setActivityPeriod] = useState<'7' | '30' | '365'>('7')
  
  const isDark = theme === 'dark'

  useEffect(() => {
    if (typeof window === 'undefined' || isHeatmapInitialized) {
      return
    }

    const initHeatmap = () => {
      const heatmapFactory =
        typeof heatmapModule === 'function'
          ? heatmapModule
          : (heatmapModule as unknown as { default?: (hc: typeof Highcharts) => void }).default

      if (typeof heatmapFactory === 'function') {
        heatmapFactory(Highcharts)
        isHeatmapInitialized = true
      } else {
        console.error('Highcharts heatmap module failed to initialize')
      }

      setChartReady(true)
    }

    initHeatmap()
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

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchStats()
    } else if (!isAuthenticated) {
      setLoading(false)
    }
  }, [fetchStats, isAuthenticated, token])

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

  if (loading || !chartReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <span className="text-lg text-slate-600 dark:text-slate-400">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Statistics</h1>
          <p className="text-gray-600 dark:text-slate-300">Track your productivity and progress</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <FontAwesomeIcon icon={faClock} className="text-red-600 text-lg" />
              </div>
              <span className="text-sm text-green-600 font-medium">+12%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{totalPomodoros.toLocaleString()}</div>
            <div className="text-sm text-gray-600 dark:text-slate-300">Total Pomodoros</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FontAwesomeIcon icon={faStopwatch} className="text-blue-600 text-lg" />
              </div>
              <span className="text-sm text-green-600 font-medium">+8%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{totalHours}h {totalMinutesRemainder}m</div>
            <div className="text-sm text-gray-600 dark:text-slate-300">Total Focus Time</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <FontAwesomeIcon icon={faCalendarCheck} className="text-orange-600 text-lg" />
              </div>
              <span className="text-sm text-green-600 font-medium">+2 days</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{currentStreak}</div>
            <div className="text-sm text-gray-600 dark:text-slate-300">Current Streak</div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">days in a row</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FontAwesomeIcon icon={faCalendarDays} className="text-purple-600 text-lg" />
              </div>
              <span className="text-sm text-green-600 font-medium">+3%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{avgTimePerDay}m</div>
            <div className="text-sm text-gray-600 dark:text-slate-300">Average Daily Time</div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">On active days</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FontAwesomeIcon icon={faFire} className="text-green-600 text-lg" />
              </div>
              <span className="text-sm text-green-600 font-medium">+18%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{focusTimeThisMonth}h {focusTimeThisMonthMinutes}m</div>
            <div className="text-sm text-gray-600 dark:text-slate-300">Focus Time</div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">This month</div>
          </motion.div>
        </div>

        {/* Weekly Chart */}
        <div className="mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6"
          >
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
          </motion.div>
        </div>

        {/* Yearly Heatmap */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 mb-8"
        >
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
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">87%</div>
              <div className="text-sm text-gray-600 dark:text-slate-300">Best Week</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">May 15-21</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">234</div>
              <div className="text-sm text-gray-600 dark:text-slate-300">Active Days</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">of 365 days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">18</div>
              <div className="text-sm text-gray-600 dark:text-slate-300">Longest Streak</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">days in a row</div>
            </div>
          </div>
        </motion.div>

        {/* Productivity Trends & Monthly Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6"
          >
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
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Monthly Breakdown</h3>
            <HighchartsReact highcharts={Highcharts} options={monthlyChartOptions} />
          </motion.div>
        </div>

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
