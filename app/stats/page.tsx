'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { useAuthStore } from '@/store/useAuthStore'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import heatmapModule from 'highcharts/modules/heatmap'

interface Stats {
  totalPomodoros: number
  totalFocusMinutes: number
  currentStreak: number
  avgMinutesPerDay: number
  focusTimeThisMonth: number
  weeklyActivity: Array<{ date: string; pomodoros: number }>
  yearlyHeatmap: Array<{ week: number; dayOfWeek: number; pomodoros: number; date: string }>
  monthlyBreakdown: Array<{ month: string; monthIndex: number; pomodoros: number }>
}

let isHeatmapInitialized = false

export default function StatsPage() {
  const { isAuthenticated, token } = useAuthStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartReady, setChartReady] = useState(false)

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
      const response = await fetch('/api/stats', {
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
  }, [token])

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
        const date = new Date(item.date)
        const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
        return days[date.getDay()]
      }) || ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
      lineColor: '#e5e7eb',
      tickColor: '#e5e7eb'
    },
    yAxis: {
      title: { text: 'Помодоро' },
      gridLineColor: '#f3f4f6'
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
      name: 'Помодоро',
      data: stats?.weeklyActivity?.map(s => s.pomodoros) || [0, 0, 0, 0, 0, 0, 0],
      color: '#3b82f6'
    }]
  }

  const heatmapOptions: Highcharts.Options = {
    chart: { 
      type: 'heatmap', 
      backgroundColor: 'transparent',
      height: 140
    },
    title: { text: '' },
    credits: { enabled: false },
    xAxis: {
      visible: false,
      min: 0,
      max: 52
    },
    yAxis: {
      categories: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
      title: { text: '' },
      reversed: true,
      labels: {
        style: { fontSize: '10px' }
      }
    },
    colorAxis: {
      min: 0,
      max: 10,
      stops: [
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
        const date = new Date(2024, 0, 1)
        date.setDate(date.getDate() + (point.x * 7) + point.y)
        return '<b>' + point.value + '</b> помодоро<br>' + 
               date.toLocaleDateString('ru-RU')
      }
    },
    plotOptions: {
      heatmap: {
        borderWidth: 2,
        borderColor: '#ffffff',
        dataLabels: { enabled: false }
      }
    },
    series: [{
      type: 'heatmap',
      name: 'Помодоро',
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
      categories: stats?.monthlyBreakdown?.map(m => m.month) || ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
      lineColor: '#e5e7eb',
      tickColor: '#e5e7eb'
    },
    yAxis: {
      title: { text: 'Помодоро' },
      gridLineColor: '#f3f4f6'
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
      name: 'Помодоро за месяц',
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <span className="text-lg text-slate-600 dark:text-slate-400">Загрузка...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Моя статистика</h1>
          <p className="text-gray-600">Отслеживайте свою продуктивность и прогресс</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-clock text-red-600 text-lg"></i>
              </div>
              <span className="text-sm text-green-600 font-medium">+12%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{totalPomodoros.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Всего помодоро</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-stopwatch text-blue-600 text-lg"></i>
              </div>
              <span className="text-sm text-green-600 font-medium">+8%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{totalHours}ч {totalMinutesRemainder}м</div>
            <div className="text-sm text-gray-600">Общее время фокуса</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-calendar-check text-orange-600 text-lg"></i>
              </div>
              <span className="text-sm text-green-600 font-medium">+2 дня</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{currentStreak}</div>
            <div className="text-sm text-gray-600">Текущая серия</div>
            <div className="text-xs text-gray-500 mt-1">дней подряд</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-calendar-days text-purple-600 text-lg"></i>
              </div>
              <span className="text-sm text-green-600 font-medium">+3%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{avgTimePerDay}м</div>
            <div className="text-sm text-gray-600">Среднее время в день</div>
            <div className="text-xs text-gray-500 mt-1">За активные дни</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-fire text-green-600 text-lg"></i>
              </div>
              <span className="text-sm text-green-600 font-medium">+18%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{focusTimeThisMonth}ч {focusTimeThisMonthMinutes}м</div>
            <div className="text-sm text-gray-600">Время фокуса</div>
            <div className="text-xs text-gray-500 mt-1">Этот месяц</div>
          </motion.div>
        </div>

        {/* Daily Goal & Weekly Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 p-6"
          >
            
            
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="8"/>
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="none" 
                    stroke="#3b82f6" 
                    strokeWidth="8" 
                    strokeDasharray="314.16" 
                    strokeDashoffset={progressDashoffset}
                    strokeLinecap="round" 
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold text-gray-900">{completed}/{dailyGoal}</div>
                  <div className="text-xs text-gray-500">помодоро</div>
                </div>
              </div>
            </div>
            
            <div className="text-center mb-4">
              <div className="text-sm text-gray-600 mb-2">{Math.round(progress)}% выполнено</div>
              <div className="text-xs text-gray-500">
                {completed >= dailyGoal 
                  ? 'Цель достигнута!' 
                  : `Осталось ${dailyGoal - completed} помодоро до цели`}
              </div>
            </div>
           <h3 className="text-lg font-bold text-gray-900">Ежедневная цель</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Сегодня</span>
                <span className="font-medium text-gray-900">{completed} помодоро</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Цель дня</span>
                <span className="font-medium text-gray-900">{dailyGoal} помодоро</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Средняя серия</span>
                <span className="font-medium text-gray-900">{currentStreak} дней</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Активность за неделю</h3>
              <div className="flex items-center space-x-2">
                <button className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-100">7д</button>
                <button className="text-xs text-white bg-blue-500 px-3 py-1 rounded-lg">30д</button>
                <button className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-100">90д</button>
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
          className="bg-white rounded-2xl border border-gray-200 p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Карта активности за год</h3>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{totalPomodoros.toLocaleString()}</span> помодоро в {new Date().getFullYear()}
              </div>
              <select className="text-sm border border-gray-200 rounded-lg px-3 py-1 bg-white">
                <option>{new Date().getFullYear()}</option>
              </select>
            </div>
          </div>
          
          <HighchartsReact highcharts={Highcharts} options={heatmapOptions} />
          
          <div className="flex items-center justify-between text-xs text-gray-500 mt-4">
            <span>Меньше</span>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-800 rounded-sm"></div>
            </div>
            <span>Больше</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">87%</div>
              <div className="text-sm text-gray-600">Лучшая неделя</div>
              <div className="text-xs text-gray-500">15-21 мая</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">234</div>
              <div className="text-sm text-gray-600">Активных дней</div>
              <div className="text-xs text-gray-500">из 365 дней</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">18</div>
              <div className="text-sm text-gray-600">Максимальная серия</div>
              <div className="text-xs text-gray-500">дней подряд</div>
            </div>
          </div>
        </motion.div>

        {/* Productivity Trends & Monthly Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-6">Тренды продуктивности</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <i className="fa-solid fa-arrow-up text-green-600 text-sm"></i>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Лучшее время</div>
                    <div className="text-xs text-gray-500">14:00 - 16:00</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">92%</div>
                  <div className="text-xs text-gray-500">эффективность</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="fa-solid fa-calendar text-blue-600 text-sm"></i>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Лучший день</div>
                    <div className="text-xs text-gray-500">Вторник</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">8.5</div>
                  <div className="text-xs text-gray-500">ср. помодоро</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <i className="fa-solid fa-target text-purple-600 text-sm"></i>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Фокус-режим</div>
                    <div className="text-xs text-gray-500">Средняя длительность</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">23м</div>
                  <div className="text-xs text-gray-500">из 25 минут</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <i className="fa-solid fa-tasks text-orange-600 text-sm"></i>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Завершенные задачи</div>
                    <div className="text-xs text-gray-500">За эту неделю</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">24</div>
                  <div className="text-xs text-gray-500">из 28</div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-6">Разбивка по месяцам</h3>
            <HighchartsReact highcharts={Highcharts} options={monthlyChartOptions} />
          </motion.div>
        </div>

        {/* Achievements */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-white rounded-2xl border border-gray-200 p-6"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-6">Достижения</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border border-gray-200 rounded-xl text-center hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-medal text-yellow-600 text-2xl"></i>
              </div>
              <div className="text-sm font-medium text-gray-900 mb-1">Первый помодоро</div>
              <div className="text-xs text-gray-500">Разблокировано</div>
            </div>

            <div className="p-4 border border-gray-200 rounded-xl text-center hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-fire text-orange-600 text-2xl"></i>
              </div>
              <div className="text-sm font-medium text-gray-900 mb-1">Неделя подряд</div>
              <div className="text-xs text-gray-500">Разблокировано</div>
            </div>

            <div className="p-4 border border-gray-200 rounded-xl text-center hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-crown text-purple-600 text-2xl"></i>
              </div>
              <div className="text-sm font-medium text-gray-900 mb-1">1000 помодоро</div>
              <div className="text-xs text-gray-500">Разблокировано</div>
            </div>

            <div className="p-4 border border-gray-200 rounded-xl text-center opacity-50">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-rocket text-gray-400 text-2xl"></i>
              </div>
              <div className="text-sm font-medium text-gray-500 mb-1">5000 помодоро</div>
              <div className="text-xs text-gray-400">{totalPomodoros}/5000</div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
