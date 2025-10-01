'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import { Calendar, Clock, Target, TrendingUp, Award, Flame } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { SessionStats } from '@/types'
import Navbar from '@/components/Navbar'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuthStore()
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats()
    }
  }, [isAuthenticated])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/stats', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">
              Authorization Required
            </h1>
            <p className="text-slate-600">
              Please log in to view your statistics.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  // Generate mock data if no stats available
  const mockStats: SessionStats = {
    totalSessions: 45,
    totalMinutes: 1125,
    todaysSessions: 3,
    todaysMinutes: 75,
    weeklyStats: [
      { date: '2024-01-15', sessions: 8, minutes: 200 },
      { date: '2024-01-16', sessions: 6, minutes: 150 },
      { date: '2024-01-17', sessions: 4, minutes: 100 },
      { date: '2024-01-18', sessions: 7, minutes: 175 },
      { date: '2024-01-19', sessions: 5, minutes: 125 },
      { date: '2024-01-20', sessions: 9, minutes: 225 },
      { date: '2024-01-21', sessions: 3, minutes: 75 },
    ],
    monthlyStats: Array.from({ length: 30 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      sessions: Math.floor(Math.random() * 10) + 1,
      minutes: Math.floor(Math.random() * 250) + 50,
    }))
  }

  const currentStats = stats || mockStats

  // Chart data
  const weeklyChartData = {
    labels: currentStats.weeklyStats.map(day => 
      new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short' })
    ),
    datasets: [
      {
        label: 'Sessions',
        data: currentStats.weeklyStats.map(day => day.sessions),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
        yAxisID: 'y',
      },
      {
        label: 'Minutes',
        data: currentStats.weeklyStats.map(day => day.minutes),
        type: 'line' as const,
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 3,
        tension: 0.4,
        yAxisID: 'y1',
      },
    ],
  }

  const monthlyChartData = {
    labels: currentStats.monthlyStats.slice(-14).map(day =>
      new Date(day.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    ),
    datasets: [
      {
        label: 'Sessions',
        data: currentStats.monthlyStats.slice(-14).map(day => day.sessions),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  }

  const sessionTypeData = {
    labels: ['Work', 'Short breaks', 'Long breaks'],
    datasets: [
      {
        data: [70, 25, 5], // Mock percentages
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
        ],
        borderWidth: 2,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  }

  const simpleChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Hi, {user?.username}! 👋
          </h1>
          <p className="text-slate-600">
            Here&apos;s your productivity statistics
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {[
            {
              title: 'Сегодня',
              value: currentStats.todaysSessions,
              subtitle: `${currentStats.todaysMinutes} минут`,
              icon: Calendar,
              color: 'text-primary-600',
              bgColor: 'bg-primary-50'
            },
            {
              title: 'Всего сессий',
              value: currentStats.totalSessions,
              subtitle: 'completed',
              icon: Target,
              color: 'text-secondary-600',
              bgColor: 'bg-secondary-50'
            },
            {
              title: 'Общее время',
              value: Math.floor(currentStats.totalMinutes / 60),
              subtitle: `${currentStats.totalMinutes % 60} минут`,
              icon: Clock,
              color: 'text-blue-600',
              bgColor: 'bg-blue-50'
            },
            {
              title: 'Текущая серия',
              value: 7,
              subtitle: 'days in a row',
              icon: Flame,
              color: 'text-orange-600',
              bgColor: 'bg-orange-50'
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                  <p className="text-sm text-slate-500">{stat.subtitle}</p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Weekly Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 card"
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Weekly Activity
            </h3>
            <div className="h-64">
              <Bar data={weeklyChartData as any} options={chartOptions as any} />
            </div>
          </motion.div>

          {/* Session Types */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card"
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2" />
              Session Types
            </h3>
            <div className="h-64">
              <Doughnut data={sessionTypeData} options={simpleChartOptions} />
            </div>
          </motion.div>
        </div>

        {/* Monthly Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Trend for the last 2 weeks
          </h3>
          <div className="h-64">
            <Line data={monthlyChartData} options={simpleChartOptions} />
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card mt-6"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2" />
            Achievements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'First Session', description: 'Completed your first pomodoro session', earned: true },
              { title: '10 Sessions', description: 'Completed 10 pomodoro sessions', earned: true },
              { title: '50 Sessions', description: 'Completed 50 pomodoro sessions', earned: false },
              { title: 'Week Streak', description: 'Worked 7 days in a row', earned: true },
              { title: 'Early Bird', description: 'Started a session before 7 AM', earned: false },
              { title: 'Night Owl', description: 'Worked after 10 PM', earned: false },
            ].map((achievement, index) => (
              <div
                key={achievement.title}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  achievement.earned
                    ? 'border-secondary-200 bg-secondary-50'
                    : 'border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                <div className="flex items-center mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                    achievement.earned ? 'bg-secondary-500' : 'bg-slate-400'
                  }`}>
                    <Award className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="font-semibold text-slate-800">{achievement.title}</h4>
                </div>
                <p className="text-sm text-slate-600">{achievement.description}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
