'use client'

import { userProfileHref } from '@/lib/userProfile'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import Link from 'next/link'
import { ArrowLeft, Check, Clock, DoorOpen, Flame, Globe2, Lock, LogOut, Settings, Sprout, Trash2, TrendingUp, UserPlus, Users, X } from 'lucide-react'
import CommunityDialog from '@/components/CommunityDialog'
import { useI18n } from '@/components/I18nProvider'
import { communityCopy } from '@/lib/i18n/community'
import Navbar from '@/components/Navbar'
import { useAuthStore } from '@/store/useAuthStore'
import { useRoomStore } from '@/store/useRoomStore'
import { Room, RoomMember, RoomPrivacy, RoomStats } from '@/types'
import { getRoomGradientClass, ROOM_GRADIENT_OPTIONS, RoomGradientKey } from '@/lib/roomGradient'

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

interface UserAvatarProps {
  avatarUrl?: string
  username: string
  size: 32 | 40
}

const UserAvatar = ({ avatarUrl, username, size }: UserAvatarProps) => avatarUrl
  ? <Image src={avatarUrl} alt="" width={size} height={size} className="community-avatar" loading="lazy" />
  : <span className="community-avatar" aria-hidden="true">{(username?.trim()?.charAt(0) || '?').toUpperCase()}</span>

export default function RoomPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { language } = useI18n()
  const copy = communityCopy[language]
  const locale = language === 'es' ? 'es-ES' : 'en-US'
  const searchParams = useSearchParams()

  const { token: storeToken, user } = useAuthStore()
  const { setCurrentRoom } = useRoomStore()

  const roomId = params?.id
  const shouldJoinOnOpen = searchParams.get('join') === '1'

  const [room, setRoom] = useState<Room | null>(null)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [stats, setStats] = useState<RoomStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [roomSettings, setRoomSettings] = useState<{ name: string; privacy: RoomPrivacy; backgroundGradientKey: RoomGradientKey | null }>({
    name: '',
    privacy: RoomPrivacy.PUBLIC,
    backgroundGradientKey: null,
  })
  const [roomSaving, setRoomSaving] = useState(false)
  const [isRoomSettingsOpen, setIsRoomSettingsOpen] = useState(false)
  const [joining, setJoining] = useState(false)
  const [confirmRemoveMemberId, setConfirmRemoveMemberId] = useState<string | null>(null)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const inviteInputRef = useRef<HTMLInputElement>(null)
  const roomNameRef = useRef<HTMLInputElement>(null)
  const [searchError, setSearchError] = useState(false)
  const [isComposing, setIsComposing] = useState(false)

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

  const isOwner = Boolean(user?.id && room?.ownerId && room.ownerId === user.id)
  const isMember = Boolean(user?.id && members.some((m) => m.user.id === user.id))
  const canLeaveRoom = Boolean(user?.id && room && (isOwner || isMember))
  const canJoinRoom = Boolean(user?.id && room?.privacy === RoomPrivacy.PUBLIC && !isOwner && !isMember)

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
      if (shouldJoinOnOpen) {
        const token = getToken()
        if (token) {
          const joinRes = await fetch(`/api/rooms/${roomId}/join`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
          })

          if (!joinRes.ok) {
            const data = (await joinRes.json().catch(() => null)) as { error?: string } | null
            setError(data?.error ?? copy.joinError)
          }
        }
      }

      const [roomRes, membersRes, statsRes] = await Promise.all([
        fetch(`/api/rooms/${roomId}`, { headers, cache: 'no-store' }),
        fetch(`/api/rooms/${roomId}/members`, { headers, cache: 'no-store' }),
        fetch(`/api/rooms/${roomId}/stats`, { headers, cache: 'no-store' }),
      ])

      if (!roomRes.ok) {
        setError(roomRes.status === 404 ? copy.roomLoadError : copy.roomLoadError)
        setLoading(false)
        return
      }

      const roomData = (await roomRes.json()) as Room
      setRoom(roomData)
      setRoomSettings({
        name: roomData.name,
        privacy: roomData.privacy,
        backgroundGradientKey: (roomData.backgroundGradientKey as RoomGradientKey | null | undefined) ?? null,
      })

      let membersList: RoomMember[] = []
      if (membersRes.ok) {
        const membersData = (await membersRes.json()) as MembersResponse
        membersList = Array.isArray(membersData.members) ? membersData.members : []
        setMembers(membersList)
      } else {
        setMembers([])
      }

      // Only set as current room if user joined or is already a member
      const userIsMember = user?.id ? membersList.some((m) => m.user.id === user.id) : false
      // if (shouldJoinOnOpen || userIsMember) {
      //   setCurrentRoom({ id: roomData.id, name: roomData.name, backgroundGradientKey: roomData.backgroundGradientKey ?? null })
      // }

      if (shouldJoinOnOpen) {
        router.replace(`/rooms/${roomId}`)
      }

      if (statsRes.ok) {
        const statsData = (await statsRes.json()) as RoomStats
        setStats(statsData)
      } else {
        setStats(null)
      }
    } catch (e) {
      console.error('Failed to load room page:', e)
      setError(copy.roomLoadError)
    } finally {
      setLoading(false)
    }
  }, [getToken, headers, roomId, router, shouldJoinOnOpen, user?.id, copy.joinError, copy.roomLoadError])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const refreshMembers = useCallback(async () => {
    if (!roomId) return
    try {
      const membersRes = await fetch(`/api/rooms/${roomId}/members`, { headers, cache: 'no-store' })
      if (!membersRes.ok) return
      const membersData = (await membersRes.json()) as MembersResponse
      setMembers(Array.isArray(membersData.members) ? membersData.members : [])
    } catch {
      // ignore
    }
  }, [headers, roomId])

  const onJoinRoom = useCallback(async () => {
    if (!roomId || !room || joining) return

    setError(null)
    const token = getToken()
    if (!token) {
      setError(copy.loginRequired)
      return
    }

    setJoining(true)
    try {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? copy.joinError)
        return
      }

      setCurrentRoom({ id: room.id, name: room.name, backgroundGradientKey: room.backgroundGradientKey ?? null })
      await refreshMembers()
    } catch (e) {
      console.error('Failed to join room:', e)
      setError(copy.joinError)
    } finally {
      setJoining(false)
    }
  }, [getToken, refreshMembers, room, roomId, setCurrentRoom, joining, copy.joinError, copy.loginRequired])

  useEffect(() => {
    const q = userQuery.trim()
    setUserResults([])
    setSearchError(false)
    if (q.length < 2 || isComposing || !isOwner) { setUserLoading(false); return }
    const controller = new AbortController()
    let active = true
    setUserLoading(true)
    const timeout = window.setTimeout(() => {
      controller.abort()
      if (active) { setUserLoading(false); setSearchError(true) }
    }, 20000)
    const debounce = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Search failed')
        const data = await response.json() as UserSearchResponse
        if (active) setUserResults(Array.isArray(data.users) ? data.users : [])
      } catch {
        if (active && !controller.signal.aborted) setSearchError(true)
      } finally {
        window.clearTimeout(timeout)
        if (active) setUserLoading(false)
      }
    }, 300)
    return () => { active = false; controller.abort(); window.clearTimeout(debounce); window.clearTimeout(timeout) }
  }, [userQuery, isComposing, isOwner])

  const filteredUserResults = useMemo(() => {
    const existingUserIds = new Set<string>()
    for (const member of members) {
      existingUserIds.add(member.user.id)
    }
    if (room?.ownerId) existingUserIds.add(room.ownerId)
    return userResults.filter((u) => !existingUserIds.has(u.id))
  }, [members, room?.ownerId, userResults])

  const isUserDropdownOpen =
    isOwner && !isComposing && !userDropdownSuppressed && userQuery.trim().length >= 2

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
      if (!roomId || addingUserId) return

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
          setError(data?.error ?? copy.inviteError)
          return
        }

        setUserQuery('')
        setUserResults([])
        showInviteToast(copy.inviteSent)
      } catch {
        setError(copy.searchError)
      } finally {
        setAddingUserId(null)
      }
    },
    [getToken, roomId, showInviteToast, addingUserId, copy.inviteSent, copy.searchError, copy.inviteError]
  )

  const onLeaveRoom = useCallback(async () => {
    if (!roomId) return
    const token = getToken()
    if (!token) {
      setError(copy.loginRequired)
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
        setError(copy.leaveError)
        return
      }

      setCurrentRoom(null)
      router.push('/rooms')
    } catch {
      setError(copy.leaveError)
    } finally {
      setLeaving(false)
    }
  }, [getToken, roomId, router, setCurrentRoom, copy.loginRequired, copy.leaveError])

  const onRemoveMember = useCallback(
    async (memberId: string) => {
      if (!roomId) return
      const token = getToken()
      if (!token) {
        setError(copy.loginRequired)
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
          setError(copy.removeError)
          return
        }

        setMembers((prev) => prev.filter((m) => m.id !== memberId))
        return true
      } catch {
        setError(copy.removeError)
      } finally {
        setRemovingMemberId(null)
      }
    },
    [getToken, roomId, copy.loginRequired, copy.removeError]
  )

  const onSaveRoomSettings = useCallback(async () => {
    if (!roomId || roomSaving) return
    setError(null)

    const token = getToken()
    if (!token) {
      setError(copy.loginRequired)
      return
    }

    const name = roomSettings.name.trim()
    if (!name) {
      setError(copy.nameRequired)
      roomNameRef.current?.focus()
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
          backgroundGradientKey: roomSettings.backgroundGradientKey,
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? copy.saveError)
        return
      }

      const updated = (await res.json()) as Room
      setRoom(updated)
      setCurrentRoom({ id: updated.id, name: updated.name, backgroundGradientKey: updated.backgroundGradientKey ?? null })
      setRoomSettings({
        name: updated.name,
        privacy: updated.privacy,
        backgroundGradientKey: (updated.backgroundGradientKey as RoomGradientKey | null | undefined) ?? null,
      })
      setIsRoomSettingsOpen(false)
    } catch (e) {
      console.error('Failed to save room settings:', e)
      setError(copy.saveError)
    } finally {
      setRoomSaving(false)
    }
  }, [getToken, roomId, roomSettings.backgroundGradientKey, roomSettings.name, roomSettings.privacy, setCurrentRoom, roomSaving, copy.loginRequired, copy.nameRequired, copy.saveError])

  const onDeleteRoom = useCallback(async () => {
    if (!roomId) return
    const token = getToken()
    if (!token) {
      setError(copy.loginRequired)
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        setError(copy.deleteError)
        return
      }

      setCurrentRoom(null)
      router.push('/rooms')
    } catch {
      setError(copy.deleteError)
    } finally {
      setDeleting(false)
    }
  }, [getToken, roomId, router, setCurrentRoom, copy.loginRequired, copy.deleteError])

  const roomGradientKeyForPreview = isRoomSettingsOpen
    ? roomSettings.backgroundGradientKey
    : (room?.backgroundGradientKey ?? null)

  const roomGradientClass = useMemo(
    () => getRoomGradientClass(roomId, roomGradientKeyForPreview),
    [roomGradientKeyForPreview, roomId]
  )

  const weeklyChartOptions: Highcharts.Options = useMemo(
    () => ({
      chart: { type: 'column', backgroundColor: 'transparent', height: 270, animation: false, style: { fontFamily: 'inherit' } },
      title: { text: '' },
      credits: { enabled: false },
      xAxis: {
        categories:
          stats?.weeklyActivity?.map((item) => {
            return new Date(item.date.slice(0, 10) + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short' })
          }) ?? [],
        lineColor: 'var(--pixel-line)',
        tickColor: 'var(--pixel-line)',
        labels: {
          rotation: 0,
          step: 1,
          style: { color: 'var(--pixel-muted)' },
        },
      },
      yAxis: {
        title: {
          text: copy.hours,
          style: { color: 'var(--pixel-muted)' },
        },
        gridLineColor: 'var(--pixel-line)',
        labels: {
          style: { color: 'var(--pixel-muted)' },
        },
      },
      legend: { enabled: false },
      tooltip: { backgroundColor: 'var(--pixel-paper)', borderColor: 'var(--pixel-line)', borderRadius: 2, style: { color: 'var(--pixel-ink)' } },
      plotOptions: {
        series: { animation: false },
        column: {
          borderRadius: 0,
          borderWidth: 0,
          pointPadding: 0.1,
          groupPadding: 0.1,
        },
      },
      series: [
        {
          type: 'column',
          name: copy.hours,
          data: stats?.weeklyActivity?.map((s) => s.hours) ?? [],
          color: 'var(--pixel-growth)',
        },
      ],
    }),
    [stats?.weeklyActivity, copy.hours, locale]
  )

  return (
    <div className="community-page garden-page" lang={language} data-no-translate>
      <Navbar compact />
      <main className="community-layout">
        <Link href="/rooms?list=1" className="community-link room-detail-breadcrumb"><ArrowLeft size={15} aria-hidden="true" />{copy.allRooms}</Link>
        {error && !isRoomSettingsOpen && !isConfirmDeleteOpen && !confirmRemoveMemberId && <div className="community-error" role="alert">{error}</div>}
        {loading ? <div className="community-panel community-state" role="status"><span className="community-spinner" aria-hidden="true" />{copy.loading}</div> : !room ? (
          <div className="community-panel community-state"><DoorOpen aria-hidden="true" /><h1>{copy.roomLoadError}</h1><button type="button" className="community-button" onClick={() => void loadAll()}>{copy.retry}</button></div>
        ) : <>
          <header className={`room-detail-header ${roomGradientClass ?? ''}`}>
            <div className="community-intro">
              <div><p className="community-eyebrow"><DoorOpen size={15} aria-hidden="true" />{copy.room}</p><h1>{room.name}</h1>
                <div className="community-actions mt-3"><span className="community-badge">{room.privacy === RoomPrivacy.PRIVATE ? <Lock size={12} aria-hidden="true" /> : <Globe2 size={12} aria-hidden="true" />}{room.privacy === RoomPrivacy.PRIVATE ? copy.private : copy.public}</span><span className="community-badge"><Users size={12} aria-hidden="true" />{members.length} {copy.participantPlural}</span>{isOwner && <span className="community-badge">{copy.owner}</span>}</div>
              </div>
              <div className="community-actions">
                {canJoinRoom && <button type="button" onClick={onJoinRoom} disabled={joining} aria-busy={joining} className="community-button community-button-primary"><UserPlus size={16} aria-hidden="true" />{copy.join}</button>}
                {isOwner && <button type="button" onClick={() => { setError(null); setRoomSettings({ name: room.name, privacy: room.privacy, backgroundGradientKey: (room.backgroundGradientKey as RoomGradientKey | null) ?? null }); setIsRoomSettingsOpen(true) }} className="community-button"><Settings size={16} aria-hidden="true" />{copy.settings}</button>}
                {canLeaveRoom && <button type="button" onClick={onLeaveRoom} disabled={leaving} aria-busy={leaving} className="community-button"><LogOut size={16} aria-hidden="true" />{copy.leave}</button>}
              </div>
            </div>
          </header>
          {stats ? <section className="community-metrics" aria-label={copy.focusTime}>
            <div className="community-metric"><span><Clock size={15} aria-hidden="true" />{copy.focusTime}</span><strong>{formatMinutes(stats.totalFocusMinutes)}</strong></div>
            <div className="community-metric"><span><Flame size={15} aria-hidden="true" />{copy.pomodoros}</span><strong>{stats.totalPomodoros.toLocaleString(locale)}</strong></div>
            <div className="community-metric"><span><TrendingUp size={15} aria-hidden="true" />{copy.average}</span><strong>{formatMinutes(stats.avgDailyFocusMinutes ?? 0)}</strong></div>
          </section> : <p className="community-error" role="status">{copy.statsUnavailable}</p>}
          <div className="community-columns">
            <section className="community-panel">
              <header className="community-panel-heading"><h2><Users size={18} aria-hidden="true" />{copy.participants}</h2><span className="community-badge">{members.length}</span></header>
              {isOwner && <div ref={userSearchRef} className="community-search" onKeyDown={event => { if (event.key === 'Escape') { setUserDropdownSuppressed(true); inviteInputRef.current?.focus() } }}>
                <label htmlFor="room-invite-search">{copy.invite}</label>
                <input id="room-invite-search" ref={inviteInputRef} value={userQuery} onChange={event => { setUserDropdownSuppressed(false); setUserQuery(event.target.value) }} onCompositionStart={() => setIsComposing(true)} onCompositionEnd={() => setIsComposing(false)} placeholder={copy.inviteHint} autoComplete="off" />
                {userQuery && <button type="button" className="community-search-clear" aria-label={copy.clear} onClick={() => { setUserQuery(''); setUserResults([]); setUserDropdownSuppressed(false); inviteInputRef.current?.focus() }}><X size={16} aria-hidden="true" /></button>}
                {isUserDropdownOpen && <div className="community-search-results" aria-label={copy.invite}>
                  {userLoading ? <p role="status">{copy.searching}</p> : searchError ? <p role="status">{copy.searchError}</p> : filteredUserResults.length === 0 ? <p role="status">{copy.noUsers}</p> : filteredUserResults.map(person => <button key={person.id} type="button" disabled={Boolean(addingUserId)} aria-busy={addingUserId === person.id} onClick={() => void onAddUser(person.username, person.id)}><UserAvatar avatarUrl={person.avatarUrl} username={person.username} size={32} /><span>{person.username}</span><UserPlus size={15} aria-hidden="true" /></button>)}
                </div>}
              </div>}
              {members.length === 0 ? <p className="community-muted">{copy.noParticipants}</p> : members.map(member => <div className="community-person" key={member.id}>
                <Link href={userProfileHref(member.user)} className="community-person-link"><UserAvatar avatarUrl={member.user.avatarUrl ?? undefined} username={member.user.username} size={40} /><span className="community-person-copy"><strong>{member.user.username}</strong><small>{member.role === 'OWNER' ? copy.owner : copy.member}</small></span></Link>
                {isOwner && member.user.id !== user?.id && member.role !== 'OWNER' && <button type="button" className="community-icon-button" disabled={Boolean(removingMemberId)} title={copy.remove} aria-label={`${copy.remove}: ${member.user.username}`} onClick={() => { setError(null); setConfirmRemoveMemberId(member.id) }}><X size={16} aria-hidden="true" /></button>}
              </div>)}
            </section>
            <div className="community-stack">
              <section className="community-panel">
                <header className="community-panel-heading"><div><h2><Sprout size={18} aria-hidden="true" />{copy.topUsers}</h2><p>{copy.topHint}</p></div></header>
                {stats?.topUsers?.length ? stats.topUsers.map(person => <div className="community-person" key={person.id}>
                  <Link href={userProfileHref(person)} className="community-person-link"><UserAvatar avatarUrl={person.avatarUrl} username={person.username} size={40} /><span className="community-person-copy"><strong>{person.username}</strong><small>{copy.contribution}: {person.contributionPercent}%</small><span className="room-contribution" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, person.contributionPercent))}%` }} /></span></span></Link><span className="community-person-value">{formatMinutes(person.hours * 60)}</span>
                </div>) : <p className="community-muted">{stats ? copy.noData : copy.statsUnavailable}</p>}
              </section>
              <section className="community-panel">
                <header className="community-panel-heading"><div><h2>{copy.weekly}</h2><p>{copy.weekHint}</p></div></header>
                {stats ? <div className="community-chart"><HighchartsReact highcharts={Highcharts} options={weeklyChartOptions} /></div> : <p className="community-muted">{copy.statsUnavailable}</p>}
              </section>
            </div>
          </div>
        </>}
      </main>
      {inviteToast && <div className="community-toast" role="status">{inviteToast}</div>}
      <CommunityDialog open={Boolean(confirmRemoveMemberId)} title={copy.removeTitle} description={copy.removeHint} busy={Boolean(removingMemberId)} onClose={() => setConfirmRemoveMemberId(null)}>
        <p className="community-muted">{members.find(member => member.id === confirmRemoveMemberId)?.user.username}</p>
        {error && <p className="community-error" role="alert">{error}</p>}
        <div className="community-dialog-actions"><button type="button" className="community-button" disabled={Boolean(removingMemberId)} onClick={() => setConfirmRemoveMemberId(null)}>{copy.cancel}</button><button type="button" className="community-button community-button-danger" disabled={Boolean(removingMemberId)} onClick={async () => { if (confirmRemoveMemberId) { if (await onRemoveMember(confirmRemoveMemberId)) setConfirmRemoveMemberId(null) } }}>{copy.remove}</button></div>
      </CommunityDialog>
      <CommunityDialog open={isConfirmDeleteOpen} title={copy.deleteTitle} description={copy.deleteHint} busy={deleting} onClose={() => setIsConfirmDeleteOpen(false)}>
        <p className="community-muted">{room?.name}</p>{error && <p className="community-error" role="alert">{error}</p>}
        <div className="community-dialog-actions"><button type="button" className="community-button" disabled={deleting} onClick={() => setIsConfirmDeleteOpen(false)}>{copy.cancel}</button><button type="button" className="community-button community-button-danger" disabled={deleting} onClick={onDeleteRoom}>{deleting ? copy.deleting : copy.delete}</button></div>
      </CommunityDialog>
      <CommunityDialog open={isOwner && isRoomSettingsOpen} title={copy.settings} busy={roomSaving} onClose={() => setIsRoomSettingsOpen(false)}>
        <form noValidate onSubmit={event => { event.preventDefault(); void onSaveRoomSettings() }}>
          <label className="community-field"><span>{copy.name}</span><input ref={roomNameRef} value={roomSettings.name} aria-invalid={error === copy.nameRequired} aria-describedby={error ? "room-settings-error" : undefined} disabled={roomSaving} onChange={event => setRoomSettings(s => ({ ...s, name: event.target.value }))} /></label>
          <fieldset className="community-privacy" disabled={roomSaving}><legend>{copy.privacy}</legend><div>{[RoomPrivacy.PUBLIC, RoomPrivacy.PRIVATE].map(privacy => <label key={privacy}><input type="radio" name="room-privacy" checked={roomSettings.privacy === privacy} onChange={() => setRoomSettings(s => ({ ...s, privacy }))} /><span>{privacy === RoomPrivacy.PUBLIC ? copy.public : copy.private}<small>{privacy === RoomPrivacy.PUBLIC ? copy.publicHint : copy.privateHint}</small></span></label>)}</div></fieldset>
          <fieldset disabled={roomSaving}><legend className="community-muted">{copy.background}</legend><div className="room-background-options">{ROOM_GRADIENT_OPTIONS.map(option => <button key={option.key} type="button" className={option.className} title={option.label} aria-label={option.label} aria-pressed={roomSettings.backgroundGradientKey === option.key} onClick={() => setRoomSettings(s => ({ ...s, backgroundGradientKey: option.key }))}>{roomSettings.backgroundGradientKey === option.key && <Check size={18} aria-hidden="true" />}</button>)}</div></fieldset>
          {error && <p id="room-settings-error" className="community-error mt-4" role="alert">{error}</p>}
          <div className="community-dialog-actions"><button type="button" className="community-button community-button-danger" disabled={roomSaving} onClick={() => { setError(null); setIsRoomSettingsOpen(false); setIsConfirmDeleteOpen(true) }}><Trash2 size={15} aria-hidden="true" />{copy.delete}</button><button type="button" className="community-button" disabled={roomSaving} onClick={() => setIsRoomSettingsOpen(false)}>{copy.cancel}</button><button type="submit" className="community-button community-button-primary" disabled={roomSaving}>{roomSaving ? copy.saving : copy.save}</button></div>
        </form>
      </CommunityDialog>
    </div>
  )
}
