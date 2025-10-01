'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock, CheckCircle, TrendingUp, Calendar, Activity } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useTimerStore } from '@/store/useTimerStore'

interface UserProfile {
  user: {
    id: string
    username: string
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

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuthStore()
  const { activeSessions } = useTimerStore()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userId = params?.id as string

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/users/${userId}`)
        
        if (response.ok) {
          const data = await response.json()
          setProfile(data)
        } else {
          setError('User not found')
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

  // Check if user is online (has active session)
  const isUserOnline = activeSessions.some(session => session.userId === userId)
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
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case 'WORK': return 'Work'
      case 'SHORT_BREAK': return 'Short break'
      case 'LONG_BREAK': return 'Long break'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">User not found</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{profile.user.username}</h1>
            <p className="text-slate-600">User Profile</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-800">Status</h2>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isUserOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-sm text-slate-600">
                    {isUserOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>

              {isUserWorking ? (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-5 h-5 text-primary-600" />
                    <span className="font-medium text-primary-800">Currently working</span>
                  </div>
                  <p className="text-primary-700 mb-2">Task: {profile.activeSession?.task}</p>
                  <div className="flex items-center gap-4 text-sm text-primary-600">
                    <span>Type: {getSessionTypeLabel(profile.activeSession?.type || '')}</span>
                    <span>Remaining: {getTimeRemaining()}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-slate-500" />
                    <span className="text-slate-600">Not working</span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Statistics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <h2 className="text-xl font-semibold text-slate-800 mb-6">Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">{profile.stats.totalSessions}</div>
                  <div className="text-sm text-slate-600">Total sessions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{profile.stats.completedSessions}</div>
                  <div className="text-sm text-slate-600">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{profile.stats.totalWorkHours}h</div>
                  <div className="text-sm text-slate-600">Work time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{profile.stats.completionRate}%</div>
                  <div className="text-sm text-slate-600">Success rate</div>
                </div>
              </div>
            </motion.div>

            {/* Recent Sessions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <h2 className="text-xl font-semibold text-slate-800 mb-6">Recent Sessions</h2>
              {profile.recentSessions.length > 0 ? (
                <div className="space-y-3">
                  {profile.recentSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{session.task}</p>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>{getSessionTypeLabel(session.type)}</span>
                          <span>{session.duration} min</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            session.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            session.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {getSessionStatusLabel(session.status)}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatDate(session.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No sessions yet</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="card"
            >
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Information</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-slate-500">Registration date</div>
                  <div className="font-medium">{formatDate(profile.user.createdAt)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Total sessions</div>
                  <div className="font-medium">{profile.user.totalSessions}</div>
                </div>
                {currentUser?.id === userId && (
                  <div className="pt-3 border-t border-slate-200">
                    <button
                      onClick={() => router.push('/profile')}
                      className="w-full bg-primary-500 text-white py-2 px-4 rounded-lg hover:bg-primary-600 transition-colors"
                    >
                      My Profile
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="card"
            >
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Achievements</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Completed {profile.stats.completedSessions} sessions</span>
                </div>
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <span className="text-sm">{profile.stats.totalWorkHours} hours of work</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-purple-500" />
                  <span className="text-sm">{profile.stats.completionRate}% success rate</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
