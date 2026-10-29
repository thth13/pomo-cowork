'use client'

import { userProfileHref } from '@/lib/userProfile'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Check, ChevronDown, DoorOpen, Globe2, Lock, LogOut, Play, Settings, Share2, Trash2, UserPlus, Users, X } from 'lucide-react'
import CommunityDialog from '@/components/CommunityDialog'
import { useI18n } from '@/components/I18nProvider'
import { communityCopy } from '@/lib/i18n/community'
import Navbar from '@/components/Navbar'
import AuthModal from '@/components/AuthModal'
import RoomDashboard from '@/components/rooms/RoomDashboard'
import RoomLiveActivity from '@/components/rooms/RoomLiveActivity'
import RoomShareDialog from '@/components/rooms/RoomShareDialog'
import { roomPageCopy } from '@/lib/i18n/roomPage'
import { roomRequest } from '@/lib/roomRequest'
import { useTimerStore } from '@/store/useTimerStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useRoomStore } from '@/store/useRoomStore'
import { Room, RoomMember, RoomPrivacy, SessionStatus } from '@/types'
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
  room: Room
  members: RoomMember[]
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
  const pageCopy = roomPageCopy[language]
  const searchParams = useSearchParams()

  const { token: storeToken, user } = useAuthStore()
  const { setCurrentRoom } = useRoomStore()

  const roomId = params?.id
  const shouldJoinOnOpen = searchParams.get('join') === '1'

  const [room, setRoom] = useState<Room | null>(null)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [membersError, setMembersError] = useState(false)
  const [membershipVersion, setMembershipVersion] = useState(0)
  const [visibleMembers, setVisibleMembers] = useState(12)
  const [shareOpen, setShareOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)
  const membersDetailsRef = useRef<HTMLDetailsElement>(null)
  const loadController = useRef<AbortController | null>(null)
  const membersController = useRef<AbortController | null>(null)
  const membersSnapshot = useRef('')
  const joiningRef = useRef(false)
  const currentSession = useTimerStore(state => state.currentSession)
  const activeElsewhere = Boolean(currentSession &&
    (currentSession.status === SessionStatus.ACTIVE || currentSession.status === SessionStatus.PAUSED) &&
    (currentSession.roomId ?? null) !== roomId)
  const activeHere = Boolean(currentSession &&
    (currentSession.status === SessionStatus.ACTIVE || currentSession.status === SessionStatus.PAUSED) &&
    currentSession.roomId === roomId)
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
    try { return localStorage.getItem('token') } catch { return null }
  }, [storeToken])

  const headers = useMemo(() => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : undefined
  }, [getToken])

  const requestScope = useRef({ roomId, headers })
  const mounted = useRef(false)
  requestScope.current = { roomId, headers }
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const isCurrentRoomRequest = useCallback(() =>
    mounted.current && requestScope.current.roomId === roomId && requestScope.current.headers === headers,
  [roomId, headers])

  const applyRoomSnapshot = useCallback((data: MembersResponse) => {
    setRoom(data.room)
    setMembers(data.members)
    setMembersError(false)
    const nextSnapshot = JSON.stringify({ ownerId: data.room.ownerId, members: data.members })
    if (nextSnapshot !== membersSnapshot.current) {
      membersSnapshot.current = nextSnapshot
      setMembershipVersion(value => value + 1)
    }
  }, [])

  const loadAll = useCallback(async () => {
    if (!roomId || !isCurrentRoomRequest()) return
    loadController.current?.abort()
    membersController.current?.abort()
    membersController.current = null
    const controller = new AbortController()
    loadController.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 20000)
    setLoading(true)
    setRoom(null)
    setMembers([])
    membersSnapshot.current = ''
    setVisibleMembers(12)
    setError(null)
    setMembersError(false)

    try {
      const response = await roomRequest(`/api/rooms/${roomId}/members`, { headers, cache: 'no-store', signal: controller.signal })
      if (loadController.current !== controller || !isCurrentRoomRequest()) return
      if (!response.ok) throw new Error('Room unavailable')
      const data = await response.json() as MembersResponse
      if (controller.signal.aborted || loadController.current !== controller || !isCurrentRoomRequest()) return
      if (data.room?.id !== roomId || !Array.isArray(data.members)) throw new Error('Invalid room snapshot')
      applyRoomSnapshot(data)
      const roomData = data.room
      setRoomSettings({ name: roomData.name, privacy: roomData.privacy, backgroundGradientKey: (roomData.backgroundGradientKey as RoomGradientKey | null) ?? null })
    } catch {
      if (loadController.current === controller && isCurrentRoomRequest()) setError(copy.roomLoadError)
    } finally {
      window.clearTimeout(timeout)
      if (loadController.current === controller && isCurrentRoomRequest()) setLoading(false)
    }
  }, [headers, roomId, copy.roomLoadError, isCurrentRoomRequest, applyRoomSnapshot])

  useEffect(() => {
    void loadAll()
    return () => { loadController.current?.abort(); loadController.current = null }
  }, [loadAll])

  useEffect(() => {
    document.title = `${room?.name ?? copy.room} · Pomo Cowork`
  }, [room?.name, copy.room])

  const refreshMembers = useCallback(async () => {
    if (!roomId || !isCurrentRoomRequest()) return
    membersController.current?.abort()
    const controller = new AbortController()
    membersController.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 20000)
    try {
      const membersRes = await roomRequest(`/api/rooms/${roomId}/members`, { headers, cache: 'no-store', signal: controller.signal })
      if (membersController.current !== controller || !isCurrentRoomRequest()) return
      if (!membersRes.ok) { setMembersError(true); return }
      const membersData = (await membersRes.json()) as MembersResponse
      if (controller.signal.aborted || membersController.current !== controller || !isCurrentRoomRequest()) return
      if (membersData.room?.id !== roomId || !Array.isArray(membersData.members)) throw new Error('Invalid room snapshot')
      applyRoomSnapshot(membersData)
    } catch {
      if (membersController.current === controller && isCurrentRoomRequest()) setMembersError(true)
    } finally {
      window.clearTimeout(timeout)
    }
  }, [headers, roomId, isCurrentRoomRequest, applyRoomSnapshot])

  const loadedRoomId = room?.id
  useEffect(() => {
    if (!loadedRoomId) return
    const refresh = () => { if (document.visibilityState === 'visible') void refreshMembers() }
    const interval = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('online', refresh)
      document.removeEventListener('visibilitychange', refresh)
      membersController.current?.abort()
      membersController.current = null
    }
  }, [loadedRoomId, refreshMembers])

  const onJoinRoom = useCallback(async () => {
    if (!roomId || !room || joiningRef.current || membersError) return false

    setError(null)
    const token = getToken()
    if (!token) {
      setError(copy.loginRequired)
      return
    }

    joiningRef.current = true
    setJoining(true)
    try {
      const res = await roomRequest(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      })
      if (!isCurrentRoomRequest()) return false

      if (!res.ok) {
        setError(copy.joinError)
        return
      }

      await refreshMembers()
      if (!isCurrentRoomRequest()) return false
      showInviteToast(pageCopy.joined)
      return true
    } catch (e) {
      console.error('Failed to join room:', e)
      if (isCurrentRoomRequest()) setError(copy.joinError)
    } finally {
      joiningRef.current = false
      setJoining(false)
    }
  }, [getToken, refreshMembers, room, roomId, membersError, showInviteToast, pageCopy.joined, copy.joinError, copy.loginRequired, isCurrentRoomRequest])

  const onStartFocus = useCallback(async () => {
    if (!room) return
    if (!user || user.isAnonymous) { setAuthOpen(true); return }
    const session = useTimerStore.getState().currentSession
    if (session && (session.status === SessionStatus.ACTIVE || session.status === SessionStatus.PAUSED) && (session.roomId ?? null) !== room.id) {
      setError(pageCopy.activeElsewhere)
      return
    }
    if (!isOwner && !isMember && !await onJoinRoom()) return
    if (useAuthStore.getState().user?.id !== user.id || window.location.pathname !== `/rooms/${room.id}`) return
    const latestSession = useTimerStore.getState().currentSession
    if (latestSession && (latestSession.status === SessionStatus.ACTIVE || latestSession.status === SessionStatus.PAUSED) && (latestSession.roomId ?? null) !== room.id) {
      setError(pageCopy.activeElsewhere)
      return
    }
    setCurrentRoom({ id: room.id, name: room.name, backgroundGradientKey: room.backgroundGradientKey ?? null })
    router.push('/')
  }, [room, user, isOwner, isMember, onJoinRoom, setCurrentRoom, router, pageCopy.activeElsewhere])

  const autoJoinAttempt = useRef('')
  useEffect(() => {
    if (!shouldJoinOnOpen || !room || !user || membersError || loading) return
    const key = `${room.id}:${user.id}`
    if (autoJoinAttempt.current === key) return
    autoJoinAttempt.current = key
    if (canJoinRoom) void onJoinRoom()
    router.replace(`/rooms/${room.id}`)
  }, [shouldJoinOnOpen, room, user, membersError, loading, canJoinRoom, onJoinRoom, router])

  const openInviteSearch = () => {
    setShareOpen(false)
    if (membersDetailsRef.current) membersDetailsRef.current.open = true
    window.requestAnimationFrame(() => {
      inviteInputRef.current?.focus()
      inviteInputRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' })
    })
  }

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
        const res = await roomRequest(`/api/rooms/${roomId}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ username }),
        })

        if (!res.ok) {
          setError(copy.inviteError)
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
    if (!roomId || leaving || activeHere || membersError) return
    const token = getToken()
    if (!token) {
      setError(copy.loginRequired)
      return
    }

    setLeaving(true)
    try {
      const res = await roomRequest(`/api/rooms/${roomId}/leave`, {
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

      if (useRoomStore.getState().currentRoomId === roomId) setCurrentRoom(null)
      router.push('/rooms')
    } catch {
      setError(copy.leaveError)
    } finally {
      setLeaving(false)
    }
  }, [getToken, roomId, router, setCurrentRoom, leaving, activeHere, membersError, copy.loginRequired, copy.leaveError])

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
        const res = await roomRequest(`/api/rooms/${roomId}/members/${memberId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!isCurrentRoomRequest()) return

        if (!res.ok) {
          setError(copy.removeError)
          void refreshMembers()
          return
        }

        // Cancel any read started before DELETE committed, then reconcile roles
        // and membership with a fresh server snapshot.
        setMembers((prev) => prev.filter((m) => m.id !== memberId))
        membersSnapshot.current = ''
        setMembershipVersion(value => value + 1)
        void refreshMembers()
        return true
      } catch {
        if (isCurrentRoomRequest()) {
          setError(copy.removeError)
          void refreshMembers()
        }
      } finally {
        setRemovingMemberId(null)
      }
    },
    [getToken, roomId, copy.loginRequired, copy.removeError, isCurrentRoomRequest, refreshMembers]
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
      const res = await roomRequest(`/api/rooms/${roomId}`, {
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
      if (!isCurrentRoomRequest()) return

      if (!res.ok) {
        setError(copy.saveError)
        void refreshMembers()
        return
      }

      const updated = (await res.json()) as Room
      if (!isCurrentRoomRequest()) return
      setRoom(updated)
      if (useRoomStore.getState().currentRoomId === updated.id) setCurrentRoom({ id: updated.id, name: updated.name, backgroundGradientKey: updated.backgroundGradientKey ?? null })
      setRoomSettings({
        name: updated.name,
        privacy: updated.privacy,
        backgroundGradientKey: (updated.backgroundGradientKey as RoomGradientKey | null | undefined) ?? null,
      })
      setIsRoomSettingsOpen(false)
      // A pre-save poll must not overwrite the updated room metadata.
      void refreshMembers()
    } catch (e) {
      console.error('Failed to save room settings:', e)
      if (isCurrentRoomRequest()) {
        setError(copy.saveError)
        void refreshMembers()
      }
    } finally {
      setRoomSaving(false)
    }
  }, [getToken, roomId, roomSettings.backgroundGradientKey, roomSettings.name, roomSettings.privacy, setCurrentRoom, roomSaving, copy.loginRequired, copy.nameRequired, copy.saveError, isCurrentRoomRequest, refreshMembers])

  const onDeleteRoom = useCallback(async () => {
    if (!roomId || deleting || activeHere) return
    const token = getToken()
    if (!token) {
      setError(copy.loginRequired)
      return
    }

    setDeleting(true)
    try {
      const res = await roomRequest(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        setError(copy.deleteError)
        return
      }

      if (useRoomStore.getState().currentRoomId === roomId) setCurrentRoom(null)
      router.push('/rooms')
    } catch {
      setError(copy.deleteError)
    } finally {
      setDeleting(false)
    }
  }, [getToken, roomId, router, setCurrentRoom, deleting, activeHere, copy.loginRequired, copy.deleteError])

  const roomGradientKeyForPreview = isRoomSettingsOpen
    ? roomSettings.backgroundGradientKey
    : (room?.backgroundGradientKey ?? null)

  const roomGradientClass = useMemo(
    () => getRoomGradientClass(roomId, roomGradientKeyForPreview),
    [roomGradientKeyForPreview, roomId]
  )

  return (
    <div className="community-page garden-page room-hub-page" lang={language} data-no-translate>
      <Navbar compact />
      <main className="community-layout">
        <Link href="/rooms?list=1" className="community-link room-detail-breadcrumb"><ArrowLeft size={15} aria-hidden="true" />{copy.allRooms}</Link>
        {error && !isRoomSettingsOpen && !isConfirmDeleteOpen && !confirmRemoveMemberId && !confirmLeaveOpen && <div className="community-error" role="alert">{error}</div>}
        {loading ? <div className="community-panel community-state" role="status"><span className="community-spinner" aria-hidden="true" />{copy.loading}</div> : !room ? (
          <div className="community-panel community-state"><DoorOpen aria-hidden="true" /><h1>{copy.roomLoadError}</h1><p>{pageCopy.unavailable}</p>{!user && <button type="button" className="community-button community-button-primary" onClick={() => setAuthOpen(true)}>{copy.signIn}</button>}<button type="button" className="community-button" onClick={() => void loadAll()}>{copy.retry}</button></div>
        ) : <>
          <header className={`room-detail-header ${roomGradientClass ?? ''}`}>
            <div className="community-intro">
              <div><p className="community-eyebrow"><DoorOpen size={15} aria-hidden="true" />{copy.room}</p><h1>{room.name}</h1>
                <div className="community-actions mt-3"><span className="community-badge">{room.privacy === RoomPrivacy.PRIVATE ? <Lock size={12} aria-hidden="true" /> : <Globe2 size={12} aria-hidden="true" />}{room.privacy === RoomPrivacy.PRIVATE ? copy.private : copy.public}</span><span className="community-badge"><Users size={12} aria-hidden="true" />{membersError ? '—' : members.length} {copy.participantPlural}</span>{isOwner && <span className="community-badge">{copy.owner}</span>}</div>
              </div>
              <div className="community-actions">
                <button type="button" onClick={() => void onStartFocus()} disabled={joining || membersError || activeElsewhere} aria-busy={joining} className="community-button community-button-primary"><Play size={15} aria-hidden="true" />{!user || user.isAnonymous ? pageCopy.signIn : isMember || isOwner ? pageCopy.focus : pageCopy.joinFocus}</button>
                <button type="button" className="community-button" onClick={() => setShareOpen(true)}><Share2 size={16} aria-hidden="true" />{pageCopy.share}</button>
                {isOwner && <button type="button" onClick={() => { setError(null); setRoomSettings({ name: room.name, privacy: room.privacy, backgroundGradientKey: (room.backgroundGradientKey as RoomGradientKey | null) ?? null }); setIsRoomSettingsOpen(true) }} className="community-button"><Settings size={16} aria-hidden="true" />{copy.settings}</button>}
                {canLeaveRoom && <button type="button" onClick={() => { setError(null); setConfirmLeaveOpen(true) }} disabled={leaving || activeHere || membersError} aria-busy={leaving} className="community-button"><LogOut size={16} aria-hidden="true" />{copy.leave}</button>}
              </div>
            </div>
          </header>
          {activeElsewhere && <p className="room-hub-focus-hint">{pageCopy.activeElsewhere} <Link href="/" className="community-link">{pageCopy.resume}</Link></p>}
          {activeHere && <p className="room-hub-focus-hint">{pageCopy.finishBeforeLeaving}</p>}
          {membersError && <div className="community-error" role="status">{pageCopy.membersUnavailable}<button type="button" className="community-button" onClick={() => void refreshMembers()}>{copy.retry}</button></div>}
          <RoomDashboard key={room.id} roomId={room.id} isOwner={isOwner} isMember={isMember || isOwner} canStartFocus={!activeElsewhere && !joining && !membersError} membershipVersion={membershipVersion} onStartFocus={() => void onStartFocus()} onShare={() => setShareOpen(true)} liveActivity={<RoomLiveActivity roomId={room.id} onStartFocus={() => void onStartFocus()} canStartFocus={!activeElsewhere && !joining && !membersError} />} />
          <details ref={membersDetailsRef} className="community-panel room-hub-members">
            <summary><span><Users size={18} aria-hidden="true" />{copy.participants}<span className="community-badge">{membersError ? '—' : members.length}</span></span><ChevronDown size={18} aria-hidden="true" /></summary>
            <div className="room-hub-members-body">
              {membersError && <div className="community-error" role="alert">{pageCopy.membersUnavailable}<button type="button" className="community-button" onClick={() => void refreshMembers()}>{copy.retry}</button></div>}
              {isOwner && <div ref={userSearchRef} className="community-search" onKeyDown={event => { if (event.key === 'Escape') { setUserDropdownSuppressed(true); inviteInputRef.current?.focus() } }}>
                <label htmlFor="room-invite-search">{copy.invite}</label>
                <input id="room-invite-search" ref={inviteInputRef} value={userQuery} onChange={event => { setUserDropdownSuppressed(false); setUserQuery(event.target.value) }} onCompositionStart={() => setIsComposing(true)} onCompositionEnd={() => setIsComposing(false)} placeholder={copy.inviteHint} autoComplete="off" />
                {userQuery && <button type="button" className="community-search-clear" aria-label={copy.clear} onClick={() => { setUserQuery(''); setUserResults([]); setUserDropdownSuppressed(false); inviteInputRef.current?.focus() }}><X size={16} aria-hidden="true" /></button>}
                {isUserDropdownOpen && <div className="community-search-results" aria-label={copy.invite}>
                  {userLoading ? <p role="status">{copy.searching}</p> : searchError ? <p role="status">{copy.searchError}</p> : filteredUserResults.length === 0 ? <p role="status">{copy.noUsers}</p> : filteredUserResults.map(person => <button key={person.id} type="button" disabled={Boolean(addingUserId)} aria-busy={addingUserId === person.id} onClick={() => void onAddUser(person.username, person.id)}><UserAvatar avatarUrl={person.avatarUrl} username={person.username} size={32} /><span>{person.username}</span><UserPlus size={15} aria-hidden="true" /></button>)}
                </div>}
              </div>}
              {membersError ? null : members.length === 0 ? <p className="community-muted">{copy.noParticipants}</p> : members.slice(0, visibleMembers).map(member => <div className="community-person" key={member.id}>
                <Link href={userProfileHref(member.user)} className="community-person-link"><UserAvatar avatarUrl={member.user.avatarUrl ?? undefined} username={member.user.username} size={40} /><span className="community-person-copy"><strong>{member.user.username}</strong><small>{member.role === 'OWNER' ? copy.owner : copy.member}</small></span></Link>
                {isOwner && member.user.id !== user?.id && member.role !== 'OWNER' && <button type="button" className="community-icon-button" disabled={Boolean(removingMemberId)} title={copy.remove} aria-label={`${copy.remove}: ${member.user.username}`} onClick={() => { setError(null); setConfirmRemoveMemberId(member.id) }}><X size={16} aria-hidden="true" /></button>}
              </div>)}
              {members.length > visibleMembers && <button type="button" className="community-button" onClick={() => setVisibleMembers(value => value + 12)}>{pageCopy.showMore}</button>}
            </div>
          </details>
        </>}
      </main>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      {room && <RoomShareDialog room={room} open={shareOpen} isOwner={isOwner} onClose={() => setShareOpen(false)} onInvite={openInviteSearch} />}
      <CommunityDialog open={confirmLeaveOpen} title={pageCopy.leaveTitle} description={isOwner ? members.some(member => member.user.id !== user?.id) ? pageCopy.leaveOwnerHint : pageCopy.leaveLastOwnerHint : pageCopy.leaveHint} busy={leaving} onClose={() => setConfirmLeaveOpen(false)}>
        <p className="community-muted">{room?.name}</p>
        {error && <p className="community-error" role="alert">{error}</p>}
        <div className="community-dialog-actions"><button type="button" className="community-button" disabled={leaving} onClick={() => setConfirmLeaveOpen(false)}>{copy.cancel}</button><button type="button" className="community-button community-button-danger" disabled={leaving} aria-busy={leaving} onClick={() => void onLeaveRoom()}>{copy.leave}</button></div>
      </CommunityDialog>
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
          <label className="community-field"><span>{copy.name}</span><input ref={roomNameRef} maxLength={60} value={roomSettings.name} aria-invalid={error === copy.nameRequired} aria-describedby={error ? "room-settings-error" : undefined} disabled={roomSaving} onChange={event => setRoomSettings(s => ({ ...s, name: event.target.value }))} /></label>
          <fieldset className="community-privacy" disabled={roomSaving}><legend>{copy.privacy}</legend><div>{[RoomPrivacy.PUBLIC, RoomPrivacy.PRIVATE].map(privacy => <label key={privacy}><input type="radio" name="room-privacy" checked={roomSettings.privacy === privacy} onChange={() => setRoomSettings(s => ({ ...s, privacy }))} /><span>{privacy === RoomPrivacy.PUBLIC ? copy.public : copy.private}<small>{privacy === RoomPrivacy.PUBLIC ? copy.publicHint : copy.privateHint}</small></span></label>)}</div></fieldset>
          <fieldset disabled={roomSaving}><legend className="community-muted">{copy.background}</legend><div className="room-background-options">{ROOM_GRADIENT_OPTIONS.map(option => <button key={option.key} type="button" className={option.className} title={option.label} aria-label={option.label} aria-pressed={roomSettings.backgroundGradientKey === option.key} onClick={() => setRoomSettings(s => ({ ...s, backgroundGradientKey: option.key }))}>{roomSettings.backgroundGradientKey === option.key && <Check size={18} aria-hidden="true" />}</button>)}</div></fieldset>
          {error && <p id="room-settings-error" className="community-error mt-4" role="alert">{error}</p>}
          <div className="community-dialog-actions"><button type="button" className="community-button community-button-danger" disabled={roomSaving || activeHere} onClick={() => { setError(null); setIsRoomSettingsOpen(false); setIsConfirmDeleteOpen(true) }}><Trash2 size={15} aria-hidden="true" />{copy.delete}</button><button type="button" className="community-button" disabled={roomSaving} onClick={() => setIsRoomSettingsOpen(false)}>{copy.cancel}</button><button type="submit" className="community-button community-button-primary" disabled={roomSaving}>{roomSaving ? copy.saving : copy.save}</button></div>
        </form>
      </CommunityDialog>
    </div>
  )
}
