'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { ArrowLeft, Clock, CheckCircle, TrendingUp, Calendar, Activity, Coffee, Utensils, Flame, BarChart3, Pencil, LogOut, Crown, Eye } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { useAuthStore } from '@/store/useAuthStore'
import { useTimerStore } from '@/store/useTimerStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useConnectionStore } from '@/store/useConnectionStore'
import Navbar from '@/components/Navbar'
import ActiveSessionTimer from '@/components/ActiveSessionTimer'
import WeeklyActivityChart from '@/components/WeeklyActivityChart'
import YearlyHeatmapChart from '@/components/YearlyHeatmapChart'

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
    isPro?: boolean
    lastSeenAt?: string | null
    profileViews?: number
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
  totalPomodoros: number
  totalFocusMinutes: number
  avgPomodorosPerDay: number
  activeDays: number
  focusTimeThisMonth: number
  currentStreak: number
  yearlyHeatmap: Array<{
    week: number
    dayOfWeek: number
    pomodoros: number
    date: string
  }>
  weeklyActivity: Array<{
    date: string
    pomodoros: number
  }>
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser, logout } = useAuthStore()
  const { activeSessions } = useTimerStore()
  const { theme } = useThemeStore()
  const { onlineUserIds } = useConnectionStore()
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

  useEffect(() => {
    if (!userId || isOwnProfile || typeof window === 'undefined') {
      return
    }

    const viewKey = `profile_viewed:${userId}`
    const lastViewedRaw = localStorage.getItem(viewKey)
    const lastViewed = lastViewedRaw ? Number(lastViewedRaw) : 0
    const now = Date.now()
    const tenMinutes = 10 * 60 * 1000

    if (!Number.isFinite(lastViewed) || now - lastViewed >= tenMinutes) {
      localStorage.setItem(viewKey, now.toString())
      const token = localStorage.getItem('token')
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
      fetch(`/api/users/${userId}/view`, { method: 'POST', headers }).catch((error) => {
        console.error('Error incrementing profile views:', error)
      })
    }
  }, [userId, isOwnProfile])

  // Generate heatmap data for the year - memoized to prevent recalculation
  const heatmapData = useMemo((): Array<[number, number, number]> => {
    if (!userStats?.yearlyHeatmap) return []
    
    return userStats.yearlyHeatmap.map(item => [
      item.week,
      item.dayOfWeek,
      item.pomodoros
    ] as [number, number, number])
  }, [userStats?.yearlyHeatmap])

  // Generate weekly activity data - memoized to prevent recalculation
  const weeklyData = useMemo(() => {
    if (!userStats) return []
    
    return userStats.weeklyActivity.map(item => item.pomodoros)
  }, [userStats?.weeklyActivity])

  const totalPomodoros = userStats?.totalPomodoros || 0
  const totalFocusMinutes = userStats?.totalFocusMinutes || 0
  const totalFocusHours = Math.floor(totalFocusMinutes / 60)
  const totalFocusMinutesRemainder = totalFocusMinutes % 60
  const totalFocusDisplay = `${totalFocusHours}h ${totalFocusMinutesRemainder}m`
  const avgPomodorosPerDay = userStats?.avgPomodorosPerDay || 0
  const avgPomodorosDisplay = Number.isFinite(avgPomodorosPerDay)
    ? (Number.isInteger(avgPomodorosPerDay) ? avgPomodorosPerDay.toString() : avgPomodorosPerDay.toFixed(1))
    : '0'
  const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weeklyCategories = useMemo(() => {
    return userStats?.weeklyActivity?.map(item => {
      const [year, month, day] = item.date.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return weekDayLabels[date.getDay()]
    }) || []
  }, [userStats?.weeklyActivity])

  // Check if user is online (connected to socket)
  const isUserOnline = onlineUserIds[userId] === true
  const isUserWorking = profile?.activeSession ? true : false

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
      case 'TIME_TRACKING': return 'Time Tracking'
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
      case 'TIME_TRACKING': return <Clock className="w-4 h-4 text-indigo-500" />
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

  const getLastSeenLabel = (lastSeenAt?: string | null) => {
    if (!lastSeenAt) {
      return 'Last seen a long time ago'
    }

    const lastSeenDate = new Date(lastSeenAt)
    if (Number.isNaN(lastSeenDate.getTime())) {
      return 'Last seen a long time ago'
    }

    return `Last seen ${formatDistanceToNowStrict(lastSeenDate, { addSuffix: true })}`
  }

  if (loading || !chartReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Profile Header Skeleton */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 animate-pulse">
            <div className="flex flex-col lg:flex-row items-start gap-6 lg:justify-between">
              <div className="flex items-start space-x-4 sm:space-x-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-2xl bg-gray-200 dark:bg-slate-700"></div>
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="h-6 sm:h-8 w-32 sm:w-48 bg-gray-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-4 sm:h-5 w-full max-w-xs bg-gray-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-3 sm:h-4 w-24 sm:w-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
                </div>
              </div>
              <div className="w-full lg:w-[280px] h-32 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Main Stats Skeleton */}
            <div className="lg:col-span-2 space-y-8">
              {/* Stats Overview Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
                      <div className="w-12 h-4 bg-gray-200 dark:bg-slate-700 rounded"></div>
                    </div>
                    <div className="h-8 w-16 bg-gray-200 dark:bg-slate-700 rounded mb-2"></div>
                    <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
                  </div>
                ))}
              </div>

              {/* Heatmap Skeleton */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 animate-pulse">
                <div className="h-6 w-48 bg-gray-200 dark:bg-slate-700 rounded mb-8"></div>
                <div className="h-40 bg-gray-200 dark:bg-slate-700 rounded"></div>
              </div>

              {/* Weekly Chart Skeleton */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 animate-pulse">
                <div className="h-6 w-48 bg-gray-200 dark:bg-slate-700 rounded mb-8"></div>
                <div className="h-80 bg-gray-200 dark:bg-slate-700 rounded"></div>
              </div>
            </div>

            {/* Recent Sessions Sidebar Skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 animate-pulse">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-6 w-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-4 w-16 bg-gray-200 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-slate-600 rounded-lg"></div>
                        <div className="space-y-2">
                          <div className="h-4 w-20 bg-gray-200 dark:bg-slate-600 rounded"></div>
                          <div className="h-3 w-32 bg-gray-200 dark:bg-slate-600 rounded"></div>
                        </div>
                      </div>
                      <div className="space-y-2 text-right">
                        <div className="h-4 w-12 bg-gray-200 dark:bg-slate-600 rounded ml-auto"></div>
                        <div className="h-3 w-16 bg-gray-200 dark:bg-slate-600 rounded ml-auto"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8"
        >
          <div className="flex flex-col lg:flex-row items-start gap-6 lg:justify-between">
            <div className="flex items-start space-x-4 sm:space-x-6">
              <div className="relative flex-shrink-0">
                {profile.user.avatarUrl ? (
                  <Image 
                    src={profile.user.avatarUrl} 
                    alt={profile.user.username}
                    width={96}
                    height={96}
                    className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold">
                    {profile.user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`absolute -top-1 -right-1 w-8 h-8 ${isUserOnline ? 'bg-green-400' : 'bg-gray-400'} rounded-full border-4 border-white dark:border-slate-800 flex items-center justify-center`}>
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white break-words">{profile.user.username}</h1>
                  {profile.user.isPro && (
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                      <Crown className="w-3 h-3" />
                      <span>PRO</span>
                    </span>
                  )}
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
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-slate-300 mb-3 break-words">{profile.user.description}</p>
                )}
                <div className="flex items-center flex-wrap gap-4 text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {formatDate(profile.user.createdAt)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4" />
                    <span>{(profile.user.profileViews ?? 0).toLocaleString()} views</span>
                  </div>
                </div>
                {!isUserOnline && (
                  <div className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                    {getLastSeenLabel(profile.user.lastSeenAt)}
                  </div>
                )}
              </div>
            </div>
            {/* Current Status */}
            <ActiveSessionTimer 
              activeSession={profile.activeSession}
              isUserOnline={isUserOnline}
              isUserWorking={isUserWorking}
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Stats */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Stats Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
            >
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 dark:text-red-400" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Total</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{totalPomodoros.toLocaleString()}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-slate-300">Pomodoros Completed</div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                    <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 dark:text-green-400" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Streak</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{userStats?.currentStreak || 0}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-slate-300">Days in a row</div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 dark:text-blue-400" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Average</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {avgPomodorosDisplay}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-slate-300">Pomodoros per day</div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 dark:text-purple-400" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Total</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{totalFocusDisplay}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-slate-300">Work Time</div>
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
              <YearlyHeatmapChart 
                Highcharts={Highcharts} 
                heatmapData={heatmapData} 
                isDark={isDark}
                yearlyHeatmap={userStats?.yearlyHeatmap}
              />
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
              <WeeklyActivityChart 
                Highcharts={Highcharts}
                weeklyData={weeklyData}
                weeklyCategories={weeklyCategories}
                isDark={isDark}
                weeklyActivity={userStats?.weeklyActivity}
              />
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
                      <span className="text-gray-600 dark:text-slate-300">Total time:</span>
                      <span className="font-bold text-gray-900 dark:text-white">{totalFocusDisplay}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                  <p>No sessions</p>
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
