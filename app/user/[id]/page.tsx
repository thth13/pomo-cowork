'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock, CheckCircle, TrendingUp, Calendar, Activity, Coffee, Utensils, Flame, BarChart3, Pencil, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useTimerStore } from '@/store/useTimerStore'
import { useThemeStore } from '@/store/useThemeStore'
import Navbar from '@/components/Navbar'
import dynamic from 'next/dynamic'

const HighchartsReact = dynamic(() => import('highcharts-react-official'), { ssr: false })

let Highcharts: any = null
let isHeatmapInitialized = false

interface UserProfile {
  user: {
    id: string
    username: string
    avatarUrl?: string
    description?: string
    createdAt: string
    totalSessions: number
  }
  stats: {
    totalSessions: number
    completedSessions: number
    totalWorkHours: number
    completionRate: number
  }
  activeSession?: {
    id: string
    task: string
    type: string
    startedAt: string
    duration: number
  }
  recentSessions: Array<{
    id: string
    task: string
    type: string
    status: string
    duration: number
    createdAt: string
    completedAt?: string
  }>
}

interface UserStats {
  currentStreak: number
  yearlyHeatmap: Array<{
    week: number
    dayOfWeek: number
    pomodoros: number
    date: string
  }>
  weeklyActivity: number[]
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser, logout } = useAuthStore()
  const { activeSessions } = useTimerStore()
  const { theme } = useThemeStore()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartReady, setChartReady] = useState(false)

  const userId = params?.id as string
  const isDark = theme === 'dark'
  const isOwnProfile = currentUser?.id === userId

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  useEffect(() => {
    if (typeof window === 'undefined' || isHeatmapInitialized) {
      return
    }

    const initHighcharts = async () => {
      try {
        const HighchartsModule = await import('highcharts')
        Highcharts = HighchartsModule.default || HighchartsModule
        
        const heatmapModule = await import('highcharts/modules/heatmap')
        const heatmapInit = heatmapModule.default || heatmapModule
        
        if (Highcharts && heatmapInit) {
          (heatmapInit as any)(Highcharts)
          isHeatmapInitialized = true
        }
        
        setChartReady(true)
      } catch (error) {
        console.error('Failed to initialize Highcharts:', error)
        setChartReady(true) // Still set ready to show the rest of the page
      }
    }

    initHighcharts()
  }, [])

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true)
        const [profileResponse, statsResponse] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch(`/api/users/${userId}/stats`)
        ])
        
        if (profileResponse.ok) {
          const data = await profileResponse.json()
          setProfile(data)
        } else {
          setError('User not found')
        }

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setUserStats(statsData)
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
        setError('Error loading profile')
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchUserProfile()
    }
  }, [userId])

  // Generate heatmap data for the year
  const generateHeatmapData = () => {
    if (!userStats?.yearlyHeatmap) return []
    
    return userStats.yearlyHeatmap.map(item => [
      item.week,
      item.dayOfWeek,
      item.pomodoros
    ])
  }

  // Generate weekly activity data
  const generateWeeklyData = () => {
    if (!userStats) return []
    
    return userStats.weeklyActivity
  }

  const heatmapOptions: Highcharts.Options = {
    chart: { 
      type: 'heatmap', 
      backgroundColor: 'transparent',
      height: 160,
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
      reversed: false,
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
        const dataPoint = userStats?.yearlyHeatmap?.find(item => {
          const date = new Date(item.date)
          const dayOfWeek = date.getDay()
          const startDate = new Date(userStats.yearlyHeatmap[0].date)
          const diffTime = date.getTime() - startDate.getTime()
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
          const weekNum = Math.floor(diffDays / 7)
          return weekNum === point.x && dayOfWeek === point.y
        })
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
      data: generateHeatmapData(),
      colsize: 1,
      rowsize: 1
    }]
  }

  const weeklyOptions: Highcharts.Options = {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      height: 320,
    },
    title: {
      text: undefined,
    },
    credits: {
      enabled: false,
    },
    xAxis: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      lineColor: isDark ? '#475569' : '#e5e7eb',
      tickColor: isDark ? '#475569' : '#e5e7eb',
      lineWidth: 0,
      tickWidth: 0,
      labels: {
        style: { color: isDark ? '#cbd5e1' : '#6b7280' }
      }
    },
    yAxis: {
      title: {
        text: undefined,
      },
      gridLineWidth: 1,
      gridLineColor: isDark ? '#334155' : '#f3f4f6',
      labels: {
        style: { color: isDark ? '#cbd5e1' : '#6b7280' }
      }
    },
    legend: {
      enabled: false,
    },
    plotOptions: {
      column: {
        borderRadius: 4,
        pointPadding: 0.2,
        groupPadding: 0.1,
        color: '#3b82f6',
      }
    },
    tooltip: {
      formatter: function(this: any) {
        return `<b>${this.x}</b><br/>Sessions: ${this.y || 0}`
      }
    },
    series: [{
      type: 'column',
      data: generateWeeklyData(),
    }]
  }

  // Check if user is online (has active session)
  const isUserOnline = activeSessions.some(session => session.userId === userId) || (profile?.activeSession ? true : false)
  const isUserWorking = profile?.activeSession ? true : false

  // Calculate time remaining for active session
  const getTimeRemaining = () => {
    if (!profile?.activeSession) return null
    
    const startTime = new Date(profile.activeSession.startedAt).getTime()
    const now = Date.now()
    const elapsed = Math.floor((now - startTime) / 1000)
    const totalDuration = profile.activeSession.duration * 60
    const remaining = Math.max(0, totalDuration - elapsed)
    
    const mins = Math.floor(remaining / 60)
    const secs = remaining % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case 'WORK': return 'Work'
      case 'SHORT_BREAK': return 'Short Break'
      case 'LONG_BREAK': return 'Long Break'
      default: return type
    }
  }

  const getSessionStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Completed'
      case 'CANCELLED': return 'Cancelled'
      case 'ACTIVE': return 'Active'
      case 'PAUSED': return 'Paused'
      default: return status
    }
  }

  const getSessionIcon = (type: string) => {
    switch (type) {
      case 'WORK': return <Clock className="w-4 h-4 text-red-500" />
      case 'SHORT_BREAK': return <Coffee className="w-4 h-4 text-green-500" />
      case 'LONG_BREAK': return <Utensils className="w-4 h-4 text-blue-500" />
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getSessionBgColor = (type: string) => {
    switch (type) {
      case 'WORK': return 'bg-red-100'
      case 'SHORT_BREAK': return 'bg-green-100'
      case 'LONG_BREAK': return 'bg-blue-100'
      default: return 'bg-gray-100'
    }
  }

  if (loading || !chartReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">User not found</h1>
          <p className="text-gray-600 dark:text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-red-500 text-white px-6 py-2 rounded-xl hover:bg-red-600 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      <Navbar />

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-8 mb-8"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              <div className="relative">
                {profile.user.avatarUrl ? (
                  <img 
                    src={profile.user.avatarUrl} 
                    alt={profile.user.username}
                    className="w-24 h-24 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-3xl font-bold">
                    {profile.user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`absolute -top-1 -right-1 w-8 h-8 ${isUserOnline ? 'bg-green-400' : 'bg-gray-400'} rounded-full border-4 border-white dark:border-slate-800 flex items-center justify-center`}>
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{profile.user.username}</h1>
                  {isOwnProfile && (
                    <>
                      <button
                        type="button"
                        onClick={() => router.push('/settings')}
                        aria-label="Edit profile"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        aria-label="Logout"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
                {profile.user.description && (
                  <p className="text-lg text-gray-600 dark:text-slate-300 mb-3">{profile.user.description}</p>
                )}
                <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-slate-400">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {formatDate(profile.user.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Current Status */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 min-w-[280px]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 ${isUserOnline ? 'bg-green-400' : 'bg-gray-400'} rounded-full ${isUserOnline ? 'pulse-dot' : ''}`}></div>
                  <span className={`text-sm font-medium ${isUserOnline ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-slate-400'}`}>
                    {isUserOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {isUserWorking ? 'Currently Working' : 'Not Working'}
                </span>
              </div>

              {isUserWorking && profile.activeSession ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{profile.activeSession.task}</div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-slate-400">{getSessionTypeLabel(profile.activeSession.type)}</span>
                    <span className="font-bold text-red-600 dark:text-red-400 text-lg">{getTimeRemaining()}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                    <div 
                      className="bg-red-500 h-1.5 rounded-full transition-all" 
                      style={{ 
                        width: `${Math.max(0, Math.min(100, ((Date.now() - new Date(profile.activeSession.startedAt).getTime()) / (profile.activeSession.duration * 60 * 1000)) * 100))}%` 
                      }}
                    ></div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 text-gray-500 dark:text-slate-400 text-sm">
                  Not currently working
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Stats */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-6"
            >
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-red-500 dark:text-red-400" />
                  </div>
                  <span className="text-sm text-gray-500 dark:text-slate-400">Total</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{profile.stats.completedSessions}</div>
                <div className="text-sm text-gray-600 dark:text-slate-300">Pomodoros Completed</div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                    <Flame className="w-6 h-6 text-green-500 dark:text-green-400" />
                  </div>
                  <span className="text-sm text-gray-500 dark:text-slate-400">Streak</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{userStats?.currentStreak || 0}</div>
                <div className="text-sm text-gray-600 dark:text-slate-300">Days in a row</div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                  </div>
                  <span className="text-sm text-gray-500 dark:text-slate-400">Average</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {profile.stats.totalSessions > 0 ? Math.round(profile.stats.completedSessions / Math.max(1, Math.ceil((Date.now() - new Date(profile.user.createdAt).getTime()) / (1000 * 60 * 60 * 24)))) : 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-300">Pomodoros per day</div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-500 dark:text-purple-400" />
                  </div>
                  <span className="text-sm text-gray-500 dark:text-slate-400">Total</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{profile.stats.totalWorkHours}h</div>
                <div className="text-sm text-gray-600 dark:text-slate-300">Work Time</div>
              </div>
            </motion.div>

            {/* Activity Heatmap */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Yearly Activity</h3>
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
            </motion.div>

            {/* Weekly Activity Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Weekly Activity</h3>
              </div>
              <HighchartsReact highcharts={Highcharts} options={weeklyOptions} />
            </motion.div>
          </div>

          {/* Recent Sessions Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Sessions</h3>
                <span className="text-sm text-gray-500 dark:text-slate-400">Latest</span>
              </div>

              {profile.recentSessions.length > 0 ? (
                <>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {profile.recentSessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 ${getSessionBgColor(session.type)} rounded-lg flex items-center justify-center`}>
                            {getSessionIcon(session.type)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{getSessionTypeLabel(session.type)}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">{session.task}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{session.duration}:00</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">{formatTime(session.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-slate-300">Всего времени:</span>
                      <span className="font-bold text-gray-900 dark:text-white">{profile.stats.totalWorkHours}ч</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                  <p>Нет сессий</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .pulse-dot {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
