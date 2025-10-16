'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import Navbar from '@/components/Navbar'

interface UserSearchResult {
  id: string
  username: string
  avatarUrl?: string
  createdAt: string
  isOnline: boolean
  rank: number
  stats: {
    totalHours: number
    totalPomodoros: number
  }
}

interface LeaderboardUser {
  id: string
  username: string
  avatarUrl?: string
  totalHours: number
  totalPomodoros: number
  rank: number
}

export default function UsersPage() {
  const router = useRouter()
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<UserSearchResult[]>([])
  const [allUsers, setAllUsers] = useState<UserSearchResult[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardUser | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [page, setPage] = useState(1)

  // Загрузка всех пользователей и топа при монтировании
  useEffect(() => {
    loadLeaderboard()
    loadAllUsers()
  }, [])

  // Поиск с дебаунсом
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.length >= 1) {
        searchUsers(searchQuery)
      } else {
        setUsers(allUsers)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, allUsers])

  const loadLeaderboard = async () => {
    setLeaderboardLoading(true)
    try {
      const response = await fetch('/api/stats/leaderboard')
      if (response.ok) {
        const data = await response.json()
        setLeaderboard(data.topUsers || [])
        setCurrentUserRank(data.currentUser || null)
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    } finally {
      setLeaderboardLoading(false)
    }
  }

  const loadAllUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/users/search?q=')
      if (response.ok) {
        const data = await response.json()
        setAllUsers(data.users || [])
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async (query: string) => {
    if (!query) {
      setUsers(allUsers)
      return
    }
    
    // Фильтруем локально для мгновенного отклика
    const filtered = allUsers.filter(user => 
      user.username.toLowerCase().includes(query.toLowerCase())
    )
    setUsers(filtered)
  }

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-500'
    if (rank === 2) return 'bg-gradient-to-r from-red-500 to-red-600'
    if (rank === 3) return 'bg-gradient-to-r from-yellow-400 to-yellow-500'
    if (rank <= 5) return 'bg-gradient-to-r from-orange-400 to-orange-500'
    if (rank <= 10) return 'bg-gradient-to-r from-blue-500 to-blue-600'
    return 'bg-gradient-to-r from-purple-500 to-purple-600'
  }

  const getLeaderboardItemStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200'
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
    if (rank === 3) return 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200'
    return ''
  }

  const getLeaderboardBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-500'
    if (rank === 2) return 'bg-gradient-to-r from-gray-400 to-gray-500'
    if (rank === 3) return 'bg-gradient-to-r from-orange-400 to-orange-500'
    return 'text-gray-600'
  }

  const getLeaderboardIcon = (rank: number) => {
    if (rank === 1) return <i className="fa-solid fa-crown text-yellow-500"></i>
    if (rank === 2) return <i className="fa-solid fa-medal text-gray-500"></i>
    if (rank === 3) return <i className="fa-solid fa-medal text-orange-500"></i>
    return null
  }

  const SkeletonUserCard = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 min-w-[280px] animate-pulse">
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-slate-700 mb-4"></div>
        <div className="h-5 w-32 bg-gray-200 dark:bg-slate-700 rounded mb-2"></div>
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="h-4 w-16 bg-gray-200 dark:bg-slate-700 rounded"></div>
          <div className="h-4 w-16 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
        <div className="h-10 w-full bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
      </div>
    </div>
  )

  const SkeletonLeaderboardItem = () => (
    <div className="flex items-center space-x-3 p-3 rounded-lg border dark:border-slate-700 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700"></div>
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700"></div>
      <div className="flex-1">
        <div className="h-4 w-24 bg-gray-200 dark:bg-slate-700 rounded mb-2"></div>
        <div className="h-3 w-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
      </div>
    </div>
  )

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
        <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex gap-8">
          {/* Основная область поиска */}
          <div className="flex-1">
            {/* Поиск */}
            <div className="mb-8">
              <div className="relative max-w-md mx-auto">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i className="fa-solid fa-search text-gray-400 dark:text-slate-500"></i>
                </div>
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Search Results */}
            <div className="search-results" style={{ height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <SkeletonUserCard />
                  <SkeletonUserCard />
                  <SkeletonUserCard />
                  <SkeletonUserCard />
                  <SkeletonUserCard />
                  <SkeletonUserCard />
                </div>
              ) : users.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {users.map((user) => (
                    <div 
                      key={user.id}
                      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all cursor-pointer min-w-[280px]"
                      onClick={() => router.push(`/user/${user.id}`)}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="relative mb-4">
                          {user.avatarUrl ? (
                            <img 
                              src={user.avatarUrl} 
                              alt={user.username}
                              className="w-20 h-20 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className={`absolute -top-1 -right-1 w-6 h-6 ${user.isOnline ? 'bg-green-400' : 'bg-gray-400 dark:bg-slate-600'} rounded-full border-2 border-white dark:border-slate-800`}></div>
                          <div className={`absolute -top-2 -right-2 min-w-[24px] h-6 rounded-xl flex items-center justify-center text-xs font-semibold border-2 border-white dark:border-slate-800 text-white ${getRankBadgeColor(user.rank)}`}>
                            #{user.rank}
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{user.username}</h3>
                        <div className="flex items-center justify-center gap-3 text-sm text-gray-500 dark:text-slate-400 mb-4">
                          <div className="flex items-center space-x-1 whitespace-nowrap">
                            <i className="fa-solid fa-clock"></i>
                            <span>{user.stats.totalHours}h</span>
                          </div>
                          <div className="flex items-center space-x-1 whitespace-nowrap">
                            <i className="fa-solid fa-fire text-red-500"></i>
                            <span>{user.stats.totalPomodoros}p</span>
                          </div>
                        </div>
                        <button 
                          className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 px-6 py-2 rounded-lg font-medium transition-colors w-full"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/user/${user.id}`)
                          }}
                        >
                          Profile
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <i className="fa-solid fa-users text-gray-300 dark:text-slate-600 text-6xl mb-4"></i>
                  <p className="text-gray-500 dark:text-slate-400">No users found</p>
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard Sidebar */}
          <div className="w-80 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 h-fit sticky top-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top by Hours</h3>
              <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-slate-400">
                <i className="fa-solid fa-trophy text-yellow-500"></i>
                <span>Week</span>
              </div>
            </div>

            <div className="space-y-4">
              {leaderboardLoading ? (
                <>
                  <SkeletonLeaderboardItem />
                  <SkeletonLeaderboardItem />
                  <SkeletonLeaderboardItem />
                  <SkeletonLeaderboardItem />
                  <SkeletonLeaderboardItem />
                  <SkeletonLeaderboardItem />
                  <SkeletonLeaderboardItem />
                </>
              ) : leaderboard.slice(0, 7).map((user) => (
                <div 
                  key={user.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border dark:border-slate-700 cursor-pointer transition-all hover:shadow-md ${getLeaderboardItemStyle(user.rank)}`}
                  onClick={() => router.push(`/user/${user.id}`)}
                >
                  <div className={`flex items-center justify-center w-8 h-8 text-white rounded-full text-sm font-bold ${user.rank <= 3 ? getLeaderboardBadgeColor(user.rank) : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
                    {user.rank}
                  </div>
                  {user.avatarUrl ? (
                    <img 
                      src={user.avatarUrl} 
                      alt={user.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">{user.username}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">{user.totalHours}h / {user.totalPomodoros} pomodoros</p>
                  </div>
                  {getLeaderboardIcon(user.rank)}
                </div>
              ))}
            </div>

            {currentUserRank && !leaderboardLoading && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                <div 
                  className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 cursor-pointer"
                  onClick={() => router.push(`/profile`)}
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full text-sm font-bold">
                    {currentUserRank.rank}
                  </div>
                  {currentUser?.avatarUrl ? (
                    <img 
                      src={currentUser.avatarUrl} 
                      alt={currentUser.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {currentUser?.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">You</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">{currentUserRank.totalHours}h / {currentUserRank.totalPomodoros} pomodoros</p>
                  </div>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Your rank</span>
                </div>
              </div>
            )}

            {/* <button 
              className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all"
              onClick={() => router.push('/stats')}
            >
              Полный рейтинг
            </button> */}
          </div>
        </div>
      </main>
    </div>
    </>
  )
}
