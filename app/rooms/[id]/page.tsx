'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faFire, faChartColumn, faUserPlus } from '@fortawesome/free-solid-svg-icons'
import Navbar from '@/components/Navbar'
import { useAuthStore } from '@/store/useAuthStore'
import { useRoomStore } from '@/store/useRoomStore'
import { useThemeStore } from '@/store/useThemeStore'
import { Room, RoomMember, RoomStats } from '@/types'

interface UserSearchItem {
  id: string
  username: string
  avatarUrl?: string
}

interface UserSearchResponse {
  users: UserSearchItem[]
}

interface MembersResponse {
  members: RoomMember[]
}

const formatMinutes = (minutes: number) => {
  const total = Math.max(0, Math.floor(minutes))
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours <= 0) return `${mins}m`
  if (mins <= 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export default function RoomPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const { token: storeToken } = useAuthStore()
  const { setCurrentRoom } = useRoomStore()
  const { theme } = useThemeStore()

  const roomId = params?.id

  const [room, setRoom] = useState<Room | null>(null)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [stats, setStats] = useState<RoomStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState<UserSearchItem[]>([])
  const [userLoading, setUserLoading] = useState(false)
  const [addingUserId, setAddingUserId] = useState<string | null>(null)

  const isDark = theme === 'dark'

  const getToken = useCallback((): string | null => {
    if (storeToken) return storeToken
    if (typeof window === 'undefined') return null
    return localStorage.getItem('token')
  }, [storeToken])

  const headers = useMemo(() => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : undefined
  }, [getToken])

  const loadAll = useCallback(async () => {
    if (!roomId) return

    setLoading(true)
    setError(null)

    try {
      const [roomRes, membersRes, statsRes] = await Promise.all([
        fetch(`/api/rooms/${roomId}`, { headers }),
        fetch(`/api/rooms/${roomId}/members`, { headers }),
        fetch(`/api/rooms/${roomId}/stats`, { headers }),
      ])

      if (!roomRes.ok) {
        setError(roomRes.status === 404 ? 'Room not found' : 'Failed to load room')
        setLoading(false)
        return
      }

      const roomData = (await roomRes.json()) as Room
      setRoom(roomData)
      setCurrentRoom({ id: roomData.id, name: roomData.name })

      if (membersRes.ok) {
        const membersData = (await membersRes.json()) as MembersResponse
        setMembers(Array.isArray(membersData.members) ? membersData.members : [])
      } else {
        setMembers([])
      }

      if (statsRes.ok) {
        const statsData = (await statsRes.json()) as RoomStats
        setStats(statsData)
      } else {
        setStats(null)
      }
    } catch (e) {
      console.error('Failed to load room page:', e)
      setError('Failed to load room')
    } finally {
      setLoading(false)
    }
  }, [headers, roomId, setCurrentRoom])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const refreshMembers = useCallback(async () => {
    if (!roomId) return
    try {
      const membersRes = await fetch(`/api/rooms/${roomId}/members`, { headers })
      if (!membersRes.ok) return
      const membersData = (await membersRes.json()) as MembersResponse
      setMembers(Array.isArray(membersData.members) ? membersData.members : [])
    } catch {
      // ignore
    }
  }, [headers, roomId])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const q = userQuery.trim()
      if (q.length < 2) {
        setUserResults([])
        return
      }

      setUserLoading(true)
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
        if (!res.ok) return
        const data = (await res.json()) as UserSearchResponse
        if (cancelled) return
        setUserResults(Array.isArray(data.users) ? data.users : [])
      } catch {
        // ignore
      } finally {
        if (!cancelled) setUserLoading(false)
      }
    }

    const t = setTimeout(run, 150)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [userQuery])

  const onAddUser = useCallback(
    async (username: string, userId: string) => {
      if (!roomId) return

      setAddingUserId(userId)
      try {
        const token = getToken()
        const res = await fetch(`/api/rooms/${roomId}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ username }),
        })

        if (res.ok) {
          setUserQuery('')
          setUserResults([])
        }
      } finally {
        setAddingUserId(null)
      }
    },
    [getToken, roomId]
  )

  const weeklyChartOptions: Highcharts.Options = useMemo(
    () => ({
      chart: { type: 'column', backgroundColor: 'transparent' },
      title: { text: '' },
      credits: { enabled: false },
      xAxis: {
        categories:
          stats?.weeklyActivity?.map((item) => {
            const date = new Date(item.date)
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            return days[date.getDay()]
          }) ?? [],
        lineColor: isDark ? '#475569' : '#e5e7eb',
        tickColor: isDark ? '#475569' : '#e5e7eb',
        labels: {
          rotation: 0,
          step: 1,
          style: { color: isDark ? '#cbd5e1' : '#6b7280' },
        },
      },
      yAxis: {
        title: {
          text: 'Hours',
          style: { color: isDark ? '#cbd5e1' : '#6b7280' },
        },
        gridLineColor: isDark ? '#334155' : '#f3f4f6',
        labels: {
          style: { color: isDark ? '#cbd5e1' : '#6b7280' },
        },
      },
      legend: { enabled: false },
      plotOptions: {
        column: {
          borderRadius: 4,
          pointPadding: 0.1,
          groupPadding: 0.1,
        },
      },
      series: [
        {
          type: 'column',
          name: 'Hours',
          data: stats?.weeklyActivity?.map((s) => s.hours) ?? [],
          color: '#3b82f6',
        },
      ],
    }),
    [isDark, stats?.weeklyActivity]
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 lg:p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {room?.name ?? 'Room'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Room page</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push('/rooms')}
                className="px-4 py-2 rounded-lg font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Back
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-sm text-gray-500 dark:text-slate-400">Loading...</div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">Total focus time</div>
                      <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                        {formatMinutes(stats?.totalFocusMinutes ?? 0)}
                      </div>
                    </div>
                    <FontAwesomeIcon icon={faClock} className="h-6 w-6 text-gray-400 dark:text-slate-300" />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">Total pomodoros</div>
                      <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                        {stats?.totalPomodoros ?? 0}
                      </div>
                    </div>
                    <FontAwesomeIcon icon={faFire} className="h-6 w-6 text-gray-400 dark:text-slate-300" />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">Average daily time</div>
                      <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                        {formatMinutes(stats?.avgDailyFocusMinutes ?? 0)}
                      </div>
                    </div>
                    <FontAwesomeIcon icon={faChartColumn} className="h-6 w-6 text-gray-400 dark:text-slate-300" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


                <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Participants</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{members.length} total</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="relative">
                      <input
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        placeholder="Invite participant by username"
                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                      />

                      {(userLoading || userResults.length > 0) && userQuery.trim().length >= 2 && (
                        <div className="absolute z-10 mt-2 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
                          {userLoading ? (
                            <div className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400">Searching...</div>
                          ) : userResults.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400">No users</div>
                          ) : (
                            <div className="max-h-64 overflow-auto">
                              {userResults.map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => onAddUser(u.username, u.id)}
                                  disabled={addingUserId === u.id}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-700 shrink-0">
                                      {u.avatarUrl ? (
                                        <Image
                                          src={u.avatarUrl}
                                          alt={u.username}
                                          width={32}
                                          height={32}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                        />
                                      ) : null}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {u.username}
                                      </div>
                                    </div>
                                  </div>
                                  <FontAwesomeIcon icon={faUserPlus} className="h-4 w-4 text-gray-400 dark:text-slate-300" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {members.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-slate-400">No participants yet</div>
                  ) : (
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 px-3 py-2"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-700 shrink-0">
                              {member.user.avatarUrl ? (
                                <Image
                                  src={member.user.avatarUrl}
                                  alt={member.user.username}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : null}
                            </div>

                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white truncate">
                                {member.user.username}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-slate-400">{member.role}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Top users</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">By total worked hours</div>
                    </div>
                  </div>

                  {stats?.topUsers && stats.topUsers.length > 0 ? (
                    <div className="space-y-2">
                      {stats.topUsers.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 px-3 py-2"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-700 shrink-0">
                              {u.avatarUrl ? (
                                <Image
                                  src={u.avatarUrl}
                                  alt={u.username}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white truncate">{u.username}</div>
                              <div className="text-xs text-gray-500 dark:text-slate-400">Contribution: {u.contributionPercent}%</div>
                            </div>
                          </div>

                          <div className="text-sm font-semibold text-gray-700 dark:text-slate-200 shrink-0">
                            {u.hours}h
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-slate-400">No data yet</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Weekly activity</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">Hours per day (last 7 days)</div>
                  </div>
                </div>

                <HighchartsReact highcharts={Highcharts} options={weeklyChartOptions} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
