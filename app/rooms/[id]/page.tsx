'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import RoomActivityChart from '@/components/RoomActivityChart'
import Link from 'next/link'
import { Check, Copy, Clock, DoorOpen, Flame, Globe2, Lock, LogOut, Settings, Target, Trash2, TrendingUp, Trophy, UserPlus, Users, X } from 'lucide-react'
import AuthModal from '@/components/AuthModal'
import CommunityDialog from '@/components/CommunityDialog'
import RoomProfileFields, { RoomProfilePreview } from '@/components/RoomProfileFields'
import RoomImage from '@/components/RoomImage'
import { roomProfileDraft, roomFormData } from '@/lib/roomProfile'
import RoomDailyChallenge from '@/components/RoomDailyChallenge'
import RoomLeaderboard from '@/components/RoomLeaderboard'
import Chat from '@/components/Chat'
import RoomInvitePreview, { type InvitePreview } from '@/components/RoomInvitePreview'
import RoomPageSkeleton from '@/components/RoomPageSkeleton'
import { RoomParticipant, RoomParticipants, RoomOnlineCount } from '@/components/RoomPresence'
import { useI18n } from '@/components/I18nProvider'
import { communityCopy } from '@/lib/i18n/community'
import Navbar from '@/components/Navbar'
import PersonalNavigation from '@/components/PersonalNavigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useRoomStore } from '@/store/useRoomStore'
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

  const { token: storeToken, user, isLoading: authLoading } = useAuthStore()
  const { setCurrentRoom } = useRoomStore()

  const roomId = params?.id
  const shouldJoinOnOpen = searchParams.get('join') === '1'
  const inviteToken = searchParams.get('invite')
  const requestedTab = searchParams.get('tab')
  const activeTab = requestedTab === 'leaderboard' ? 'leaderboard' : 'overview'
  const roomTabHref = (tab: 'overview' | 'leaderboard') => {
    const next = new URLSearchParams(searchParams.toString())
    next.delete('join')
    next.delete('invite')
    if (tab !== 'overview') next.set('tab', tab)
    else next.delete('tab')
    const query = next.toString()
    return `/rooms/${roomId}${query ? `?${query}` : ''}`
  }

  const [room, setRoom] = useState<Room | null>(null)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [stats, setStats] = useState<RoomStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [roomSettings, setRoomSettings] = useState<{ name: string; privacy: RoomPrivacy }>({
    name: '',
    privacy: RoomPrivacy.PUBLIC,
  })
  const [profile, setProfile] = useState(() => roomProfileDraft())
  const [roomSaving, setRoomSaving] = useState(false)
  const [isRoomSettingsOpen, setIsRoomSettingsOpen] = useState(false)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [previewAttempt, setPreviewAttempt] = useState(0)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null)
  const guestInvite = Boolean(shouldJoinOnOpen && inviteToken && !user?.id)

  useEffect(() => {
    if (!guestInvite || authLoading) return
    const controller = new AbortController()
    setLoading(true)
    setInvitePreview(null)
    setRoom(null)
    setIsAuthModalOpen(false)
    setError(null)
    void (async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}/invite-preview`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invite: inviteToken }), cache: 'no-store', signal: controller.signal,
        })
        if (!response.ok) throw new Error(response.status === 403 || response.status === 404 ? copy.invalidInviteLink : copy.roomLoadError)
        const preview = await response.json() as InvitePreview
        if (controller.signal.aborted) return
        setInvitePreview(preview)
        setIsAuthModalOpen(true)
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : copy.roomLoadError)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [guestInvite, authLoading, roomId, inviteToken, previewAttempt, copy.invalidInviteLink, copy.roomLoadError])
  const [inviteLink, setInviteLink] = useState('')
  const [inviteLinkLoading, setInviteLinkLoading] = useState(false)
  const [inviteLinkError, setInviteLinkError] = useState(false)
  const [inviteLinkAttempt, setInviteLinkAttempt] = useState(0)
  const [linkCopied, setLinkCopied] = useState(false)
  const [copyLinkError, setCopyLinkError] = useState(false)
  const [isChallengeOpen, setIsChallengeOpen] = useState(false)
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
  const inviteSendingRef = useRef(false)
  const [userDropdownSuppressed, setUserDropdownSuppressed] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const leavingRef = useRef(false)
  const [isLeaveOpen, setIsLeaveOpen] = useState(false)
  const [leaveMembers, setLeaveMembers] = useState<RoomMember[] | null>(null)
  const [leaveMembersLoading, setLeaveMembersLoading] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [nextOwnerId, setNextOwnerId] = useState('')
  const leaveCandidates = leaveMembers?.filter(member => member.user.id !== user?.id) ?? []
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
  const canInvite = Boolean(user?.id && room && (isOwner || isMember))
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
    if (!roomId || authLoading || guestInvite) return

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
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ invite: inviteToken }),
            cache: 'no-store',
          })

          if (!joinRes.ok) {
            const data = (await joinRes.json().catch(() => null)) as { error?: string } | null
            setError(inviteToken && joinRes.status === 403 ? copy.invalidInviteLink : data?.error ?? copy.joinError)
            if (inviteToken) { setRoom(null); return }
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
      setProfile(roomProfileDraft(roomData))
      setRoomSettings({
        name: roomData.name,
        privacy: roomData.privacy,
      })

      let membersList: RoomMember[] = []
      if (membersRes.ok) {
        const membersData = (await membersRes.json()) as MembersResponse
        membersList = Array.isArray(membersData.members) ? membersData.members : []
        setMembers(membersList)
      } else {
        setMembers([])
      }

      // Select only after membership is confirmed; the store preserves a running timer's room.
      const userIsMember = user?.id ? membersList.some((m) => m.user.id === user.id) : false
      if (shouldJoinOnOpen && userIsMember) {
        setCurrentRoom({ id: roomData.id, name: roomData.name, backgroundGradientKey: roomData.backgroundGradientKey ?? null })
      }

      if (shouldJoinOnOpen && userIsMember) {
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
  }, [authLoading, guestInvite, getToken, headers, roomId, router, shouldJoinOnOpen, inviteToken, user?.id, setCurrentRoom, copy.joinError, copy.roomLoadError, copy.invalidInviteLink])

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
    if (q.length < 2 || isComposing || !canInvite || !isInviteOpen) { setUserLoading(false); return }
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
  }, [userQuery, isComposing, canInvite, isInviteOpen])

  const filteredUserResults = useMemo(() => {
    const existingUserIds = new Set<string>()
    for (const member of members) {
      existingUserIds.add(member.user.id)
    }
    if (room?.ownerId) existingUserIds.add(room.ownerId)
    return userResults.filter((u) => !existingUserIds.has(u.id))
  }, [members, room?.ownerId, userResults])

  const isUserDropdownOpen =
    canInvite && isInviteOpen && !isComposing && !userDropdownSuppressed && userQuery.trim().length >= 2

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

  useEffect(() => {
    if (!canInvite || !isInviteOpen || !roomId) return
    const controller = new AbortController()
    let active = true
    setInviteLink('')
    setInviteLinkLoading(true)
    setInviteLinkError(false)
    setLinkCopied(false)
    setCopyLinkError(false)
    const timeout = window.setTimeout(() => {
      controller.abort()
      if (active) { setInviteLinkLoading(false); setInviteLinkError(true) }
    }, 20000)
    const token = getToken()
    void fetch(`/api/rooms/${roomId}/invite-link`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error('Could not create invitation link')
      const data = await response.json() as { path: string }
      if (active) setInviteLink(new URL(data.path, window.location.origin).href)
    }).catch(() => {
      if (active) setInviteLinkError(true)
    }).finally(() => {
      window.clearTimeout(timeout)
      if (active) setInviteLinkLoading(false)
    })
    return () => { active = false; controller.abort(); window.clearTimeout(timeout) }
  }, [canInvite, isInviteOpen, roomId, getToken, inviteLinkAttempt])

  const onCopyInviteLink = async () => {
    if (!inviteLink) return
    setCopyLinkError(false)
    try {
      await navigator.clipboard.writeText(inviteLink)
      setLinkCopied(true)
    } catch {
      setCopyLinkError(true)
    }
  }

  const onAddUser = useCallback(
    async (username: string, userId: string) => {
      if (!roomId || !canInvite || inviteSendingRef.current) return

      inviteSendingRef.current = true
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
        setError(copy.inviteError)
      } finally {
        inviteSendingRef.current = false
        setAddingUserId(null)
      }
    },
    [getToken, roomId, canInvite, showInviteToast, copy.inviteSent, copy.inviteError]
  )

  const loadLeaveMembers = useCallback(async () => {
    setLeaveMembersLoading(true)
    setLeaveMembers(null)
    setNextOwnerId('')
    try {
      const [roomRes, membersRes] = await Promise.all([
        fetch(`/api/rooms/${roomId}`, { headers, cache: 'no-store' }),
        fetch(`/api/rooms/${roomId}/members`, { headers, cache: 'no-store' }),
      ])
      if (!roomRes.ok || !membersRes.ok) throw new Error('Room unavailable')
      const roomData = await roomRes.json() as Room
      const membersData = await membersRes.json() as MembersResponse
      if (!Array.isArray(membersData.members)) throw new Error('Participants unavailable')
      setRoom(roomData)
      if (roomData.ownerId !== user?.id) {
        setIsLeaveOpen(false)
        setError(copy.leaveMembersChanged)
        return
      }
      setMembers(membersData.members)
      setLeaveMembers(membersData.members)
    } catch {
      setLeaveError(copy.leaveMembersError)
    } finally {
      setLeaveMembersLoading(false)
    }
  }, [roomId, headers, user?.id, copy.leaveMembersError, copy.leaveMembersChanged])

  const onLeaveRoom = useCallback(async (confirmed = false) => {
    if (!roomId || leavingRef.current || leaveMembersLoading) return
    const token = getToken()
    if (!token) {
      if (isLeaveOpen) setLeaveError(copy.loginRequired)
      else setError(copy.loginRequired)
      return
    }
    if (isOwner && !confirmed) {
      setLeaveError(null)
      setIsLeaveOpen(true)
      await loadLeaveMembers()
      return
    }
    if (isOwner && (!leaveMembers || leaveMembersLoading || (leaveCandidates.length > 0 && !nextOwnerId))) return

    leavingRef.current = true
    setLeaving(true)
    setLeaveError(null)
    try {
      const res = await fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(isOwner
          ? leaveCandidates.length > 0 ? { nextOwnerId } : { confirmDelete: true }
          : {}),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        if (data?.code === 'ROOM_MEMBERS_CHANGED') {
          setIsLeaveOpen(true)
          setLeaveError(copy.leaveMembersChanged)
          await loadLeaveMembers()
        } else if (isLeaveOpen) setLeaveError(copy.leaveError)
        else setError(copy.leaveError)
        return
      }
      setIsLeaveOpen(false)
      setCurrentRoom(null)
      router.push('/rooms')
    } catch {
      if (isLeaveOpen) setLeaveError(copy.leaveError)
      else setError(copy.leaveError)
    } finally {
      leavingRef.current = false
      setLeaving(false)
    }
  }, [getToken, roomId, router, setCurrentRoom, copy.loginRequired, copy.leaveError, copy.leaveMembersChanged, isOwner, isLeaveOpen, leaveMembers, leaveMembersLoading, leaveCandidates.length, nextOwnerId, loadLeaveMembers])

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
          Authorization: `Bearer ${token}`,
        },
        body: roomFormData(name, roomSettings.privacy, profile),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? copy.saveError)
        return
      }

      const updated = (await res.json()) as Room
      setRoom(updated)
      setCurrentRoom({ id: updated.id, name: updated.name, backgroundGradientKey: updated.backgroundGradientKey ?? null })
      setProfile(roomProfileDraft(updated))
      setRoomSettings({
        name: updated.name,
        privacy: updated.privacy,
      })
      setIsRoomSettingsOpen(false)
    } catch (e) {
      console.error('Failed to save room settings:', e)
      setError(copy.saveError)
    } finally {
      setRoomSaving(false)
    }
  }, [getToken, roomId, profile, roomSettings.name, roomSettings.privacy, setCurrentRoom, roomSaving, copy.loginRequired, copy.nameRequired, copy.saveError])

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

  return (
    <div className="community-page garden-page" lang={language} data-no-translate>
      <Navbar compact />
      <main className="community-layout personal-page-frame">
        <PersonalNavigation />
        {error && !isInviteOpen && !isRoomSettingsOpen && !isConfirmDeleteOpen && !confirmRemoveMemberId && <div className="community-error" role="alert">{error}</div>}
        {guestInvite && invitePreview && !loading ? (
          <RoomInvitePreview room={invitePreview} onAuthenticate={mode => { setAuthMode(mode); setIsAuthModalOpen(true) }} />
        ) : loading ? <RoomPageSkeleton /> : !room ? (
          <div className="community-panel community-state"><DoorOpen aria-hidden="true" /><h1>{copy.roomLoadError}</h1><button type="button" className="community-button" onClick={() => guestInvite ? setPreviewAttempt(value => value + 1) : void loadAll()}>{copy.retry}</button></div>
        ) : <>
          <header className="room-detail-header">
            <RoomImage src={room.backgroundImageUrl} background />
            <div className="community-intro room-header-layout">
              <div className="room-header-identity">
                <div className="room-header-title">
                  <RoomImage src={room.avatarUrl} />
                  <div><p className="community-eyebrow"><DoorOpen size={15} aria-hidden="true" />{copy.room}</p><h1>{room.name}</h1></div>
                </div>
                {room.description && <p className="room-description">{room.description}</p>}
                <div className="community-actions mt-3"><span className="community-badge">{room.privacy === RoomPrivacy.PRIVATE ? <Lock size={12} aria-hidden="true" /> : <Globe2 size={12} aria-hidden="true" />}{room.privacy === RoomPrivacy.PRIVATE ? copy.private : copy.public}</span><span className="community-badge"><Users size={12} aria-hidden="true" />{members.length} {copy.participantPlural}</span>{isOwner && <span className="community-badge">{copy.owner}</span>}<RoomOnlineCount members={members} /></div>
              </div>
              <div className="room-header-tools">
                {isOwner && <button type="button" onClick={() => { setError(null); setRoomSettings({ name: room.name, privacy: room.privacy }); setProfile(roomProfileDraft(room)); setIsRoomSettingsOpen(true) }} className="community-icon-button room-settings-button" title={copy.settings} aria-label={copy.settings}><Settings size={18} aria-hidden="true" /></button>}
              </div>
              <div className="community-actions room-header-actions">
                {canJoinRoom && <button type="button" onClick={onJoinRoom} disabled={joining} aria-busy={joining} className="community-button community-button-primary"><UserPlus size={16} aria-hidden="true" />{copy.join}</button>}
                {canInvite && <button type="button" onClick={() => { setError(null); setUserDropdownSuppressed(false); setIsInviteOpen(true) }} className="community-button"><UserPlus size={16} aria-hidden="true" />{copy.inviteFriends}</button>}
                {isOwner && <button type="button" onClick={() => { setIsChallengeOpen(true) }} className="community-button"><Target size={16} aria-hidden="true" />{copy.challenge.setGoal}</button>}
                {canLeaveRoom && <button type="button" onClick={() => void onLeaveRoom()} disabled={leaving || leaveMembersLoading} aria-busy={leaving || leaveMembersLoading} className="community-button"><LogOut size={16} aria-hidden="true" />{copy.leave}</button>}
              </div>
            </div>
          </header>
          <RoomDailyChallenge key={room.id} roomId={room.id} token={getToken()} isOwner={isOwner} userId={user?.id} membershipKey={members.map(member => member.user.id).sort().join(',')} onSaved={showInviteToast} open={isOwner && isChallengeOpen} onOpen={() => setIsChallengeOpen(true)} onClose={() => setIsChallengeOpen(false)} />
          {stats ? <section className="community-metrics" aria-label={copy.focusTime}>
            <div className="community-metric"><span><Clock size={15} aria-hidden="true" />{copy.focusTime}</span><strong>{formatMinutes(stats.totalFocusMinutes)}</strong></div>
            <div className="community-metric"><span><Flame size={15} aria-hidden="true" />{copy.pomodoros}</span><strong>{stats.totalPomodoros.toLocaleString(locale)}</strong></div>
            <div className="community-metric"><span><TrendingUp size={15} aria-hidden="true" />{copy.average}</span><strong>{formatMinutes(stats.avgDailyFocusMinutes ?? 0)}</strong></div>
          </section> : <p className="community-error" role="status">{copy.statsUnavailable}</p>}
          <nav className="room-tabs" aria-label={copy.room}>
            <Link href={roomTabHref('overview')} scroll={false} aria-current={activeTab === 'overview' ? 'page' : undefined}><Users size={16} aria-hidden="true" />{copy.overviewTab}</Link>
            <Link href={roomTabHref('leaderboard')} scroll={false} aria-current={activeTab === 'leaderboard' ? 'page' : undefined}><Trophy size={16} aria-hidden="true" />{copy.leaderboardTab}</Link>
          </nav>
          <div hidden={activeTab !== 'overview'}>
            <RoomActivityChart key={room.id} roomId={room.id} token={storeToken} initialStats={stats} />
            <div className="community-columns">
              <div className="community-stack">
                <Chat key={room.id} roomId={room.id} title={copy.chatTab} mode="messages" className="room-chat" isVisible={activeTab === 'overview'} />
                <section className="community-panel">
                  <header className="community-panel-heading"><h2><Users size={18} aria-hidden="true" />{copy.participants}</h2><div className="community-actions"><span className="community-badge">{members.length}</span><RoomOnlineCount members={members} /></div></header>

                  {members.length === 0 ? <p className="community-muted">{copy.noParticipants}</p> : <RoomParticipants members={members} roomId={room.id}>{member => <RoomParticipant key={member.id} member={member} roomId={room.id}
                    avatar={<UserAvatar avatarUrl={member.user.avatarUrl ?? undefined} username={member.user.username} size={40} />}
                    actions={isOwner && member.user.id !== user?.id && member.role !== 'OWNER' ? <button type="button" className="community-icon-button" disabled={Boolean(removingMemberId)} title={copy.remove} aria-label={`${copy.remove}: ${member.user.username}`} onClick={() => { setError(null); setConfirmRemoveMemberId(member.id) }}><X size={16} aria-hidden="true" /></button> : undefined}
                  />}</RoomParticipants>}
                </section>
              </div>
              <div className="community-stack">
                <Chat key={`activities-${room.id}`} roomId={room.id} title={copy.activities} mode="activities" className="room-chat room-activities" isVisible={activeTab === 'overview'} />
              </div>
            </div>
          </div>
          {activeTab === 'leaderboard' && <RoomLeaderboard roomId={roomId} currentUserId={user?.id} />}
        </>}
      </main>
      {inviteToast && !isInviteOpen && <div className="community-toast" role="status">{inviteToast}</div>}
      <AuthModal isOpen={isAuthModalOpen && !user?.id} initialMode={authMode} invitation={guestInvite && invitePreview ? { roomName: invitePreview.name, description: copy.roomInvitation.hint } : undefined} onClose={() => setIsAuthModalOpen(false)} />
      <CommunityDialog open={canInvite && isInviteOpen} variant="room-invite" title={copy.inviteFriends} busy={Boolean(addingUserId)} onClose={() => setIsInviteOpen(false)}>
        <div className="room-invite-link">
          <label className="community-field" htmlFor="room-invite-link"><span>{copy.inviteLink}</span><input id="room-invite-link" readOnly value={inviteLink} aria-busy={inviteLinkLoading} placeholder={inviteLinkLoading ? copy.linkLoading : ''} onFocus={event => event.currentTarget.select()} /></label>
          <button type="button" className="community-button" disabled={!inviteLink || inviteLinkLoading} onClick={() => void onCopyInviteLink()}>{linkCopied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{linkCopied ? copy.linkCopied : copy.copyLink}</button>
          <p className="community-muted">{copy.inviteLinkHint}</p>
          {inviteLinkError && <div className="community-error" role="alert">{copy.linkError} <button type="button" className="community-button" onClick={() => setInviteLinkAttempt(value => value + 1)}>{copy.retry}</button></div>}
          {copyLinkError && <p className="community-error" role="alert">{copy.copyLinkError}</p>}
          <span className="sr-only" role="status">{linkCopied ? copy.linkCopied : ''}</span>
        </div>
        <div ref={userSearchRef} className="community-search room-invite-search" onKeyDown={event => {
          if (isComposing || event.nativeEvent.isComposing || !isUserDropdownOpen) return
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setUserDropdownSuppressed(true); inviteInputRef.current?.focus(); return }
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
          const options = Array.from(userSearchRef.current?.querySelectorAll<HTMLButtonElement>('.community-search-results button:not(:disabled)') ?? [])
          if (!options.length) return
          const current = options.indexOf(document.activeElement as HTMLButtonElement)
          const next = current === -1 ? (event.key === 'ArrowDown' ? 0 : options.length - 1) : current + (event.key === 'ArrowDown' ? 1 : -1)
          event.preventDefault()
          if (next < 0 || next >= options.length) inviteInputRef.current?.focus()
          else options[next].focus()
        }}>
          <label htmlFor="room-invite-search">{copy.invite}</label>
          <input id="room-invite-search" ref={inviteInputRef} autoFocus disabled={Boolean(addingUserId)} value={userQuery} onChange={event => { setUserDropdownSuppressed(false); setUserQuery(event.target.value) }} onCompositionStart={() => setIsComposing(true)} onCompositionEnd={() => setIsComposing(false)} placeholder={copy.inviteHint} autoComplete="off" />
          {userQuery && <button type="button" className="community-search-clear" aria-label={copy.clear} onClick={() => { setUserQuery(''); setUserResults([]); setUserDropdownSuppressed(false); inviteInputRef.current?.focus() }}><X size={16} aria-hidden="true" /></button>}
          {isUserDropdownOpen && <div className="community-search-results" aria-label={copy.invite}>
            {userLoading ? <p role="status">{copy.searching}</p> : searchError ? <p role="status">{copy.searchError}</p> : filteredUserResults.length === 0 ? <p role="status">{copy.noUsers}</p> : filteredUserResults.map(person => <button key={person.id} type="button" disabled={Boolean(addingUserId)} aria-busy={addingUserId === person.id} onClick={() => void onAddUser(person.username, person.id)}><UserAvatar avatarUrl={person.avatarUrl} username={person.username} size={32} /><span>{person.username}</span><UserPlus size={15} aria-hidden="true" /></button>)}
          </div>}
        </div>
        {inviteToast && <p className="community-muted" role="status">{inviteToast}</p>}
        {error && <p className="community-error" role="alert">{error}</p>}
      </CommunityDialog>
      <CommunityDialog open={isLeaveOpen} variant="room-leave" title={copy.leaveOwnerTitle}
        description={leaveMembers ? (leaveCandidates.length > 0 ? copy.leaveOwnerHint : copy.leaveLastHint) : undefined}
        busy={leaving} onClose={() => setIsLeaveOpen(false)}>
        {leaveMembersLoading && <p className="community-muted" role="status">{copy.loading}</p>}
        {leaveMembers && leaveCandidates.length > 0 && <fieldset className="community-privacy room-leave-candidates" disabled={leaving}>
          <legend>{copy.nextOwner}</legend>
          <div>{leaveCandidates.map(member => <label key={member.id}>
            <input type="radio" name="room-next-owner" value={member.user.id} checked={nextOwnerId === member.user.id} onChange={() => setNextOwnerId(member.user.id)} />
            <UserAvatar avatarUrl={member.user.avatarUrl} username={member.user.username} size={32} />
            <span>{member.user.username}</span>
          </label>)}</div>
        </fieldset>}
        {leaveError && <p className="community-error" role="alert">{leaveError}</p>}
        {!leaveMembers && !leaveMembersLoading && <button type="button" className="community-button" onClick={() => { setLeaveError(null); void loadLeaveMembers() }}>{copy.retry}</button>}
        <div className="community-dialog-actions">
          <button type="button" className="community-button" autoFocus disabled={leaving} onClick={() => setIsLeaveOpen(false)}>{copy.cancel}</button>
          <button type="button" className={`community-button ${leaveMembers && leaveCandidates.length === 0 ? 'community-button-danger' : 'community-button-primary'}`}
            disabled={leaving || leaveMembersLoading || !leaveMembers || (leaveCandidates.length > 0 && !nextOwnerId)} aria-busy={leaving}
            onClick={() => void onLeaveRoom(true)}>{leaveMembers && leaveCandidates.length === 0 ? copy.deleteAndLeave : copy.transferAndLeave}</button>
        </div>
      </CommunityDialog>
      <CommunityDialog open={Boolean(confirmRemoveMemberId)} title={copy.removeTitle} description={copy.removeHint} busy={Boolean(removingMemberId)} onClose={() => setConfirmRemoveMemberId(null)}>
        <p className="community-muted">{members.find(member => member.id === confirmRemoveMemberId)?.user.username}</p>
        {error && <p className="community-error" role="alert">{error}</p>}
        <div className="community-dialog-actions"><button type="button" className="community-button" disabled={Boolean(removingMemberId)} onClick={() => setConfirmRemoveMemberId(null)}>{copy.cancel}</button><button type="button" className="community-button community-button-danger" disabled={Boolean(removingMemberId)} onClick={async () => { if (confirmRemoveMemberId) { if (await onRemoveMember(confirmRemoveMemberId)) setConfirmRemoveMemberId(null) } }}>{copy.remove}</button></div>
      </CommunityDialog>
      <CommunityDialog open={isConfirmDeleteOpen} title={copy.deleteTitle} description={copy.deleteHint} busy={deleting} onClose={() => setIsConfirmDeleteOpen(false)}>
        <p className="community-muted">{room?.name}</p>{error && <p className="community-error" role="alert">{error}</p>}
        <div className="community-dialog-actions"><button type="button" className="community-button" disabled={deleting} onClick={() => setIsConfirmDeleteOpen(false)}>{copy.cancel}</button><button type="button" className="community-button community-button-danger" disabled={deleting} onClick={onDeleteRoom}>{deleting ? copy.deleting : copy.delete}</button></div>
      </CommunityDialog>
      <CommunityDialog open={isOwner && isRoomSettingsOpen} variant="room-settings" title={copy.settings} busy={roomSaving} onClose={() => setIsRoomSettingsOpen(false)}>
        <form className="room-profile-form" noValidate onSubmit={event => { event.preventDefault(); void onSaveRoomSettings() }}>
          <div className="room-profile-columns">
            <div className="room-profile-controls">
              <label className="community-field"><span>{copy.name}</span><input ref={roomNameRef} value={roomSettings.name} aria-invalid={error === copy.nameRequired} aria-describedby={error ? "room-settings-error" : undefined} disabled={roomSaving} onChange={event => setRoomSettings(s => ({ ...s, name: event.target.value }))} /></label>
              <RoomProfileFields value={profile} onChange={setProfile} disabled={roomSaving} />
              <fieldset className="community-privacy" disabled={roomSaving}><legend>{copy.privacy}</legend><div>{[RoomPrivacy.PUBLIC, RoomPrivacy.PRIVATE].map(privacy => <label key={privacy}><input type="radio" name="room-privacy" checked={roomSettings.privacy === privacy} onChange={() => setRoomSettings(s => ({ ...s, privacy }))} /><span>{privacy === RoomPrivacy.PUBLIC ? copy.public : copy.private}<small>{privacy === RoomPrivacy.PUBLIC ? copy.publicHint : copy.privateHint}</small></span></label>)}</div></fieldset>
            </div>
            <RoomProfilePreview value={profile} onChange={setProfile} disabled={roomSaving} />
          </div>
          {error && <p id="room-settings-error" className="community-error mt-4" role="alert">{error}</p>}
          <div className="community-dialog-actions"><button type="button" className="community-button community-button-danger" disabled={roomSaving} onClick={() => { setError(null); setIsRoomSettingsOpen(false); setIsConfirmDeleteOpen(true) }}><Trash2 size={15} aria-hidden="true" />{copy.delete}</button><button type="button" className="community-button" disabled={roomSaving} onClick={() => setIsRoomSettingsOpen(false)}>{copy.cancel}</button><button type="submit" className="community-button community-button-primary" disabled={roomSaving} aria-busy={roomSaving}>{roomSaving ? copy.saving : copy.save}</button></div>
        </form>
      </CommunityDialog>
    </div>
  )
}
