'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faFire, faChartColumn, faUserPlus, faXmark, faGear } from '@fortawesome/free-solid-svg-icons'
import Navbar from '@/components/Navbar'
import { useAuthStore } from '@/store/useAuthStore'
import { useRoomStore } from '@/store/useRoomStore'
import { useThemeStore } from '@/store/useThemeStore'
import { Room, RoomMember, RoomPrivacy, RoomStats } from '@/types'

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

const RoomPageSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="h-3 w-24 bg-gray-200 dark:bg-slate-700 rounded" />
              <div className="mt-2 h-8 w-32 bg-gray-200 dark:bg-slate-700 rounded" />
            </div>
            <div className="h-6 w-6 bg-gray-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="h-4 w-28 bg-gray-200 dark:bg-slate-700 rounded" />
            <div className="mt-2 h-3 w-16 bg-gray-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
        <div className="mb-3 h-10 w-full bg-gray-200 dark:bg-slate-700 rounded-lg" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 px-3 py-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-slate-700" />
                <div className="min-w-0">
                  <div className="h-4 w-28 bg-gray-200 dark:bg-slate-700 rounded" />
                  <div className="mt-2 h-3 w-16 bg-gray-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="h-4 w-24 bg-gray-200 dark:bg-slate-700 rounded" />
            <div className="mt-2 h-3 w-40 bg-gray-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 px-3 py-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-slate-700" />
                <div className="min-w-0">
                  <div className="h-4 w-28 bg-gray-200 dark:bg-slate-700 rounded" />
                  <div className="mt-2 h-3 w-32 bg-gray-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
              <div className="h-4 w-10 bg-gray-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="h-4 w-28 bg-gray-200 dark:bg-slate-700 rounded" />
          <div className="mt-2 h-3 w-44 bg-gray-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
      <div className="h-56 w-full bg-gray-100 dark:bg-slate-700/40 rounded-lg" />
    </div>
  </div>
)

const formatMinutes = (minutes: number) => {
  const total = Math.max(0, Math.floor(minutes))
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours <= 0) return `${mins}m`
  if (mins <= 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

interface UserAvatarProps {
  avatarUrl?: string
  username: string
  size: 32 | 40
}

const UserAvatar = ({ avatarUrl, username, size }: UserAvatarProps) => {
  const sizeClass = size === 32 ? 'h-8 w-8' : 'h-10 w-10'
  const textClass = size === 32 ? 'text-xs' : 'text-sm'
  const initial = (username?.trim()?.charAt(0) || '?').toUpperCase()

  if (avatarUrl) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden bg-gray-200 dark:bg-slate-700 shrink-0`}>
        <Image
          src={avatarUrl}
          alt={username}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center text-gray-700 dark:text-slate-200 ${textClass} font-semibold shrink-0`}
    >
      {initial}
    </div>
  )
}

export default function RoomPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const { token: storeToken, user } = useAuthStore()
  const { setCurrentRoom } = useRoomStore()
  const { theme } = useThemeStore()

  const roomId = params?.id

  const [room, setRoom] = useState<Room | null>(null)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [stats, setStats] = useState<RoomStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [roomSettings, setRoomSettings] = useState<{ name: string; privacy: RoomPrivacy }>({
    name: '',
    privacy: RoomPrivacy.PUBLIC,
  })
  const [roomSaving, setRoomSaving] = useState(false)
  const [isRoomSettingsOpen, setIsRoomSettingsOpen] = useState(false)
  const [confirmRemoveMemberId, setConfirmRemoveMemberId] = useState<string | null>(null)
  const settingsModalShouldCloseRef = useRef(false)

  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState<UserSearchItem[]>([])
  const [userLoading, setUserLoading] = useState(false)
  const [addingUserId, setAddingUserId] = useState<string | null>(null)
  const [userDropdownSuppressed, setUserDropdownSuppressed] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [inviteToast, setInviteToast] = useState<string | null>(null)
  const inviteToastTimeoutRef = useRef<number | null>(null)

  const userSearchRef = useRef<HTMLDivElement | null>(null)

  const showInviteToast = useCallback((message: string) => {
    setInviteToast(message)
    if (inviteToastTimeoutRef.current) {
      window.clearTimeout(inviteToastTimeoutRef.current)
    }
    inviteToastTimeoutRef.current = window.setTimeout(() => {
      setInviteToast(null)
      inviteToastTimeoutRef.current = null
    }, 2200)
  }, [])

  useEffect(() => {
    return () => {
      if (inviteToastTimeoutRef.current) {
        window.clearTimeout(inviteToastTimeoutRef.current)
      }
    }
  }, [])

  const isDark = theme === 'dark'
  const isOwner = Boolean(user?.id && room?.ownerId && room.ownerId === user.id)
  const isMember = Boolean(user?.id && members.some((m) => m.user.id === user.id))

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
      setRoomSettings({ name: roomData.name, privacy: roomData.privacy })

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
        setUserDropdownSuppressed(false)
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

  const filteredUserResults = useMemo(() => {
    const existingUserIds = new Set<string>()
    for (const member of members) {
      existingUserIds.add(member.user.id)
    }
    if (room?.ownerId) existingUserIds.add(room.ownerId)
    return userResults.filter((u) => !existingUserIds.has(u.id))
  }, [members, room?.ownerId, userResults])

  const isUserDropdownOpen =
    !userDropdownSuppressed && userQuery.trim().length >= 2 && (userLoading || filteredUserResults.length > 0)

  useEffect(() => {
    if (!isUserDropdownOpen) return

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (!userSearchRef.current) return
      if (userSearchRef.current.contains(target)) return
      setUserResults([])
      setUserDropdownSuppressed(true)
    }

    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [isUserDropdownOpen])

  const onAddUser = useCallback(
    async (username: string, userId: string) => {
      if (!roomId) return

      setAddingUserId(userId)
      setError(null)
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

        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null
          setError(data?.error ?? 'Failed to send invite')
          return
        }

        setUserQuery('')
        setUserResults([])
        showInviteToast('Invitation sent')
      } finally {
        setAddingUserId(null)
      }
    },
    [getToken, roomId, showInviteToast]
  )

  const onLeaveRoom = useCallback(async () => {
    if (!roomId) return
    const token = getToken()
    if (!token) {
      setError('Unauthorized')
      return
    }

    setLeaving(true)
    try {
      const res = await fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        setError('Failed to leave room')
        return
      }

      setCurrentRoom(null)
      router.push('/rooms')
    } catch {
      setError('Failed to leave room')
    } finally {
      setLeaving(false)
    }
  }, [getToken, roomId, router, setCurrentRoom])

  const onRemoveMember = useCallback(
    async (memberId: string) => {
      if (!roomId) return
      const token = getToken()
      if (!token) {
        setError('Unauthorized')
        return
      }

      setRemovingMemberId(memberId)
      try {
        const res = await fetch(`/api/rooms/${roomId}/members/${memberId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          setError('Failed to remove participant')
          return
        }

        setMembers((prev) => prev.filter((m) => m.id !== memberId))
      } catch {
        setError('Failed to remove participant')
      } finally {
        setRemovingMemberId(null)
      }
    },
    [getToken, roomId]
  )

  const onSaveRoomSettings = useCallback(async () => {
    if (!roomId) return
    setError(null)

    const token = getToken()
    if (!token) {
      setError('Login required')
      return
    }

    const name = roomSettings.name.trim()
    if (!name) {
      setError('Room name is required')
      return
    }

    setRoomSaving(true)
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          privacy: roomSettings.privacy,
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? 'Failed to save room')
        return
      }

      const updated = (await res.json()) as Room
      setRoom(updated)
      setCurrentRoom({ id: updated.id, name: updated.name })
      setRoomSettings({ name: updated.name, privacy: updated.privacy })
      setIsRoomSettingsOpen(false)
    } catch (e) {
      console.error('Failed to save room settings:', e)
      setError('Failed to save room')
    } finally {
      setRoomSaving(false)
    }
  }, [getToken, roomId, roomSettings.name, roomSettings.privacy, setCurrentRoom])

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
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setIsRoomSettingsOpen(true)}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  title="Settings"
                  aria-label="Room settings"
                >
                  <FontAwesomeIcon icon={faGear} className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => router.push('/rooms')}
                className="px-4 py-2 rounded-lg font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Back
              </button>

              {isMember && !isOwner && (
                <button
                  type="button"
                  onClick={onLeaveRoom}
                  disabled={leaving}
                  className="px-4 py-2 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  Leave group
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <RoomPageSkeleton />
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
                    <div ref={userSearchRef} className="relative">
                      <input
                        value={userQuery}
                        onChange={(e) => {
                          setUserDropdownSuppressed(false)
                          setUserQuery(e.target.value)
                        }}
                        placeholder="Invite participant by username"
                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                      />

                      {isUserDropdownOpen && (
                        <div className="absolute z-10 mt-2 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
                          {userLoading ? (
                            <div className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400">Searching...</div>
                          ) : filteredUserResults.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400">No users</div>
                          ) : (
                            <div className="max-h-64 overflow-auto">
                              {filteredUserResults.map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => onAddUser(u.username, u.id)}
                                  disabled={addingUserId === u.id}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <UserAvatar avatarUrl={u.avatarUrl} username={u.username} size={32} />
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {u.username}
                                      </div>
                                    </div>
                                  </div>
                                  {addingUserId === u.id ? (
                                    <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-slate-600 border-t-gray-600 dark:border-t-slate-200 animate-spin" />
                                  ) : (
                                    <FontAwesomeIcon
                                      icon={faUserPlus}
                                      className="h-4 w-4 text-gray-400 dark:text-slate-300"
                                    />
                                  )}
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
                          onClick={() => router.push(`/user/${member.user.id}`)}
                          className="w-full flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 px-3 py-2 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar avatarUrl={member.user.avatarUrl ?? undefined} username={member.user.username} size={40} />

                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white truncate">
                                {member.user.username}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-slate-400">{member.role}</div>
                            </div>
                          </div>

                          {isOwner && user?.id && member.user.id !== user.id && member.role !== 'OWNER' && (
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (removingMemberId) return
                                  setConfirmRemoveMemberId((prev) => (prev === member.id ? null : member.id))
                                }}
                                disabled={removingMemberId === member.id}
                                className="p-2 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                                title="Remove participant"
                              >
                                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                              </button>

                              {confirmRemoveMemberId === member.id && (
                                <div className="absolute right-10 top-1/2 -translate-y-1/2 z-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg px-3 py-2">
                                  <div className="text-xs font-medium text-gray-700 dark:text-slate-200 whitespace-nowrap">
                                    Are you sure?
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        setConfirmRemoveMemberId(null)
                                        await onRemoveMember(member.id)
                                      }}
                                      className="px-2 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmRemoveMemberId(null)}
                                      className="px-2 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                                    >
                                      No
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
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
                            <UserAvatar avatarUrl={u.avatarUrl} username={u.username} size={40} />
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

      {inviteToast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="rounded-xl bg-gray-900 text-white dark:bg-slate-900 px-4 py-3 shadow-lg">
            <span className="text-sm font-semibold">{inviteToast}</span>
          </div>
        </div>
      )}

      {isOwner && isRoomSettingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onMouseDown={(e) => {
            settingsModalShouldCloseRef.current = e.target === e.currentTarget
          }}
          onClick={(e) => {
            if (!settingsModalShouldCloseRef.current || e.target !== e.currentTarget) {
              settingsModalShouldCloseRef.current = false
              return
            }
            settingsModalShouldCloseRef.current = false
            setIsRoomSettingsOpen(false)
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Room settings</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Name & privacy</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRoomSettingsOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300">Name</span>
                <input
                  value={roomSettings.name}
                  onChange={(e) => setRoomSettings((s) => ({ ...s, name: e.target.value }))}
                  className="mt-1 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300">Privacy</span>
                <select
                  value={roomSettings.privacy}
                  onChange={(e) => setRoomSettings((s) => ({ ...s, privacy: e.target.value as RoomPrivacy }))}
                  className="mt-1 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value={RoomPrivacy.PUBLIC}>Public</option>
                  <option value={RoomPrivacy.PRIVATE}>Private</option>
                </select>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRoomSettingsOpen(false)}
                className="px-4 py-2 rounded-lg font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveRoomSettings}
                disabled={roomSaving}
                className="px-4 py-2 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {roomSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
