'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, Check, Crown, DoorOpen, Globe2, Lock, Plus, Users } from 'lucide-react'
import Link from 'next/link'
import CommunityDialog from '@/components/CommunityDialog'
import RoomProfileFields, { RoomProfilePreview } from '@/components/RoomProfileFields'
import RoomImage from '@/components/RoomImage'
import { roomProfileDraft, roomFormData } from '@/lib/roomProfile'
import { useI18n } from '@/components/I18nProvider'
import { communityCopy } from '@/lib/i18n/community'
import Navbar from '@/components/Navbar'
import PersonalNavigation from '@/components/PersonalNavigation'
import PersonalPageSkeleton from '@/components/PersonalPageSkeleton'
import AuthModal from '@/components/AuthModal'
import { PaywallModal } from '@/components/PaywallModal'
import { useAuthStore } from '@/store/useAuthStore'
import { useRoomStore } from '@/store/useRoomStore'
import { useTimerStore } from '@/store/useTimerStore'
import { Room, RoomPrivacy } from '@/types'

interface RoomFormState {
  name: string
  privacy: RoomPrivacy
}

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export default function RoomsPage() {
  const router = useRouter()
  const { language } = useI18n()
  const copy = communityCopy[language]
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore()
  const { currentRoomId, setCurrentRoom, resetToGlobal } = useRoomStore()

  const isRunning = useTimerStore(state => state.isRunning)
  const currentSession = useTimerStore(state => state.currentSession)
  const isWorkRoomLocked = (roomId: string | null) => Boolean(isRunning && currentSession && (currentSession.roomId ?? null) !== roomId)

  const isProMember = Boolean(user?.isPro && (!user?.proExpiresAt || new Date(user.proExpiresAt) > new Date()))

  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(() => roomProfileDraft())
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const [createForm, setCreateForm] = useState<RoomFormState>({
    name: '',
    privacy: RoomPrivacy.PUBLIC,
  })

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const openPaywallOrRegister = () => {
    if (!isAuthenticated || user?.isAnonymous) {
      setIsAuthModalOpen(true)
      return
    }

    setIsPaywallOpen(true)
  }

  const loadRooms = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setRooms([])
    setError(null)

    try {
      const headers: Record<string, string> = {}
      const token = getToken()
      if (token) headers.Authorization = `Bearer ${token}`

      const response = await fetch('/api/rooms', { headers, signal, cache: 'no-store' })
      if (signal?.aborted) return
      if (!response.ok) {
        setError(copy.roomsLoadError)
        return
      }

      const data = (await response.json()) as Room[]
      if (!signal?.aborted) setRooms(data)
    } catch (e) {
      if (signal?.aborted) return
      console.error('Failed to load rooms:', e)
      setError(copy.roomsLoadError)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [copy.roomsLoadError])

  useEffect(() => {
    if (authLoading) return
    const controller = new AbortController()
    void loadRooms(controller.signal)
    return () => controller.abort()
  }, [authLoading, user?.id, loadRooms])

  const onJoinRoom = (room: Room) => {
    setError(null)

    const token = getToken()
    if (!token) {
      setError(copy.loginRequired)
      return
    }

    router.push(`/rooms/${room.id}?join=1`)
  }

  const onWorkInGlobal = () => {
    resetToGlobal()
  }

  const onCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (creating) return
    setError(null)

    const token = getToken()
    if (!token) {
      setError(copy.loginRequired)
      return
    }

    const name = createForm.name.trim()
    if (!name) {
      setError(copy.nameRequired)
      nameInputRef.current?.focus()
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: roomFormData(name, createForm.privacy, profile),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? copy.createError)
        return
      }

      const created = (await response.json()) as Room
      setRooms((prev) => [created, ...prev])
      setCreateForm({ name: '', privacy: RoomPrivacy.PUBLIC })
      setProfile(roomProfileDraft())

      setIsCreateModalOpen(false)

      setCurrentRoom({ id: created.id, name: created.name, backgroundGradientKey: created.backgroundGradientKey ?? null })
      router.push(`/rooms/${created.id}`)
    } catch (e) {
      console.error('Failed to create room:', e)
      setError(copy.createError)
    } finally {
      setCreating(false)
    }
  }


  const myRooms = rooms.filter(room => user && (room.isMember || room.ownerId === user.id))
  const otherRooms = rooms.filter(room => !user || (!room.isMember && room.ownerId !== user.id))
  const renderRooms = (items: Room[]) => <div className="rooms-grid">
    {items.map(room => {
      const isOwner = user?.id === room.ownerId
      const isJoined = Boolean(user && (room.isMember || isOwner))
      const isSelected = currentRoomId === room.id
      return <article key={room.id} className="room-card" data-current={isSelected}>
        <RoomImage src={room.backgroundImageUrl} background />
        <div className="room-card-top">
          <RoomImage src={room.avatarUrl} />
          <div className="community-actions">
            {isSelected && <span className="room-active-workspace"><Check size={12} aria-hidden="true" />{copy.activeWorkspace}</span>}
            {isJoined && !isSelected && <span className="community-badge"><Check size={11} aria-hidden="true" />{copy.roomJoined}</span>}
            <span className="community-badge">{room.privacy === RoomPrivacy.PRIVATE ? <Lock size={11} aria-hidden="true" /> : <Globe2 size={11} aria-hidden="true" />}{room.privacy === RoomPrivacy.PRIVATE ? copy.private : copy.public}</span>
            {isOwner && <span className="community-badge"><Crown size={11} aria-hidden="true" />{copy.owner}</span>}
          </div>
        </div>
        <div><h3><Link href={`/rooms/${room.id}`}>{room.name}</Link></h3><p className="community-muted room-description room-description-summary">{room.description || copy.room}</p></div>
        <footer className="room-card-footer">
          <span className="community-muted"><Users size={14} className="inline mr-1" aria-hidden="true" />{room.memberCount ?? 0} {room.memberCount === 1 ? copy.participant : copy.participantPlural}</span>
          <div className="community-actions">
            {isJoined ? <>
              <Link href={`/rooms/${room.id}`} className="community-button">{copy.open}<ArrowUpRight size={14} aria-hidden="true" /></Link>
              <button type="button" className={`community-button ${isSelected ? '' : 'community-button-primary'}`} aria-pressed={isSelected} disabled={isWorkRoomLocked(room.id)} aria-describedby={isWorkRoomLocked(room.id) ? 'room-work-locked-hint' : undefined} onClick={() => setCurrentRoom({ id: room.id, name: room.name, backgroundGradientKey: room.backgroundGradientKey ?? null })}>
                {isSelected && <Check size={14} aria-hidden="true" />}{isSelected ? copy.workspaceSelected : copy.setWorkspace}
              </button>
            </> : <button type="button" className="community-button community-button-primary" onClick={() => onJoinRoom(room)}>
              {copy.join}<ArrowUpRight size={14} aria-hidden="true" />
            </button>}
          </div>
        </footer>
      </article>
    })}
  </div>


  return (
    <div className="community-page garden-page" data-no-translate lang={language}>
      <Navbar compact />
      <main className="community-layout personal-page-frame">
        <PersonalNavigation />
        <div className="community-actions rooms-actions">
          <button type="button" className="community-button community-button-primary" onClick={() => {
            if (!isProMember) { openPaywallOrRegister(); return }
            setError(null)
            setIsCreateModalOpen(true)
          }}>
            {isProMember ? <Plus size={16} aria-hidden="true" /> : <Lock size={15} aria-hidden="true" />}
            {copy.createRoom}{!isProMember && <span className="community-badge">PRO</span>}
          </button>
        </div>

        {error && !isCreateModalOpen && <div className="community-error" role="alert"><p>{error}</p><button type="button" className="community-button" onClick={() => void loadRooms()}>{copy.retry}</button></div>}

        {isRunning && currentSession && <p id="room-work-locked-hint" className="community-muted rooms-work-hint">{copy.workRoomLocked}</p>}

        {user && <section className="rooms-memberships" aria-labelledby="my-rooms-title">
          <div className="rooms-directory-heading"><h2 id="my-rooms-title">{copy.myRooms}</h2><span>{!loading && `${myRooms.length} ${copy.roomCount}`}</span></div>
          {loading ? <PersonalPageSkeleton variant="rooms" /> : myRooms.length > 0 ? renderRooms(myRooms) : !error && <p className="community-muted">{copy.noJoinedRooms}</p>}
        </section>}

        <section className="rooms-global" data-current={currentRoomId === null} aria-labelledby="global-room-title">
          <div className="rooms-global-symbol"><Globe2 size={30} aria-hidden="true" /></div>
          <div className="rooms-global-copy">
            {currentRoomId === null && <span className="room-active-workspace"><Check size={12} aria-hidden="true" />{copy.activeWorkspace}</span>}
            <h2 id="global-room-title">{copy.global}</h2><p>{copy.globalHint}</p>
          </div>
          <button type="button" className="community-button" onClick={onWorkInGlobal} aria-pressed={currentRoomId === null} disabled={isWorkRoomLocked(null)} aria-describedby={isWorkRoomLocked(null) ? 'room-work-locked-hint' : undefined}>
            {currentRoomId === null ? <Check size={16} aria-hidden="true" /> : <ArrowUpRight size={16} aria-hidden="true" />}
            {currentRoomId === null ? copy.workspaceSelected : copy.setWorkspace}
          </button>
        </section>

        <section aria-labelledby="room-directory-title">
          <div className="rooms-directory-heading"><h2 id="room-directory-title">{copy.roomDirectory}</h2><span>{!loading && `${otherRooms.length} ${copy.roomCount}`}</span></div>
          {loading ? <PersonalPageSkeleton variant="rooms" /> : error ? null : otherRooms.length === 0 ? (
            <div className="community-panel community-state"><DoorOpen aria-hidden="true" /><h2>{copy.emptyRooms}</h2><p>{copy.emptyRoomsHint}</p></div>
          ) : renderRooms(otherRooms)}
        </section>
      </main>
      <CommunityDialog open={isCreateModalOpen} variant="room-settings" title={copy.createRoom} description={copy.createHint} busy={creating} onClose={() => setIsCreateModalOpen(false)}>
        <form className="room-profile-form" noValidate onSubmit={onCreateRoom}>
          <div className="room-profile-columns">
            <div className="room-profile-controls">
              <label className="community-field"><span>{copy.name}</span>
                <input ref={nameInputRef} value={createForm.name} onChange={event => setCreateForm(s => ({ ...s, name: event.target.value }))} placeholder={copy.roomName} disabled={creating} aria-invalid={error === copy.nameRequired} aria-describedby={error ? 'create-room-error' : undefined} />
              </label>
              <RoomProfileFields value={profile} onChange={setProfile} disabled={creating} />
              <fieldset className="community-privacy" disabled={creating}><legend>{copy.privacy}</legend><div>
                {[RoomPrivacy.PUBLIC, RoomPrivacy.PRIVATE].map(privacy => <label key={privacy}>
                  <input type="radio" name="create-room-privacy" value={privacy} checked={createForm.privacy === privacy} onChange={() => setCreateForm(s => ({ ...s, privacy }))} />
                  <span>{privacy === RoomPrivacy.PUBLIC ? copy.public : copy.private}<small>{privacy === RoomPrivacy.PUBLIC ? copy.publicHint : copy.privateHint}</small></span>
                </label>)}
              </div></fieldset>
            </div>
            <RoomProfilePreview value={profile} onChange={setProfile} disabled={creating} />
          </div>
          {error && <p id="create-room-error" className="community-error" role="alert">{error}</p>}
          <div className="community-dialog-actions">
            <button type="button" className="community-button" onClick={() => setIsCreateModalOpen(false)} disabled={creating}>{copy.cancel}</button>
            <button type="submit" className="community-button community-button-primary" disabled={!user || creating} aria-busy={creating}>{creating ? copy.creating : copy.create}</button>
          </div>
        </form>
      </CommunityDialog>
      {isPaywallOpen && <PaywallModal onClose={() => setIsPaywallOpen(false)} />}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode="register" />
    </div>
  )
}
