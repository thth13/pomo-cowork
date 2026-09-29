'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, Check, Crown, DoorOpen, Globe2, Lock, Plus, Sprout, Users } from 'lucide-react'
import Link from 'next/link'
import CommunityDialog from '@/components/CommunityDialog'
import { useI18n } from '@/components/I18nProvider'
import { communityCopy } from '@/lib/i18n/community'
import Navbar from '@/components/Navbar'
import AuthModal from '@/components/AuthModal'
import { PaywallModal } from '@/components/PaywallModal'
import { useAuthStore } from '@/store/useAuthStore'
import { useRoomStore } from '@/store/useRoomStore'
import { Room, RoomPrivacy } from '@/types'

interface RoomFormState {
  name: string
  privacy: RoomPrivacy
}

export default function RoomsPage() {
  const router = useRouter()
  const { language } = useI18n()
  const copy = communityCopy[language]
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore()
  const { currentRoomId, setCurrentRoom, resetToGlobal } = useRoomStore()

  const isProMember = Boolean(user?.isPro && (!user?.proExpiresAt || new Date(user.proExpiresAt) > new Date()))

  const shouldForceList = searchParams.get('list') === '1'

  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

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

  const getToken = (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('token')
  }

  const loadRooms = async () => {
    setLoading(true)
    setError(null)

    try {
      const headers: Record<string, string> = {}
      const token = getToken()
      if (token) headers.Authorization = `Bearer ${token}`

      const response = await fetch('/api/rooms', { headers })
      if (!response.ok) {
        setError(copy.roomsLoadError)
        return
      }

      const data = (await response.json()) as Room[]
      setRooms(data)
    } catch (e) {
      console.error('Failed to load rooms:', e)
      setError(copy.roomsLoadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return

    const token = getToken()

    const run = async () => {
      if (user && token && !shouldForceList) {
        setIsRedirecting(true)
        setLoading(true)
        setError(null)

        try {
          const response = await fetch('/api/rooms/mine', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (response.ok) {
            const data = (await response.json().catch(() => null)) as { rooms?: Room[] } | null
            const myRooms = Array.isArray(data?.rooms) ? data.rooms : []

            if (myRooms.length > 0) {
              const preferred = currentRoomId ? myRooms.find((r) => r.id === currentRoomId) : null
              const target = preferred ?? myRooms[0]

              // setCurrentRoom({
              //   id: target.id,
              //   name: target.name,
              //   backgroundGradientKey: target.backgroundGradientKey ?? null,
              // })

              router.replace(`/rooms/${target.id}`)
              return
            }
          }
        } catch (e) {
          console.warn('Auto-redirect check failed:', e)
        }
        
        setIsRedirecting(false)
      }

      await loadRooms()
    }

    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, shouldForceList])

  const onOpenRoom = (room: { id: string; name: string; backgroundGradientKey?: string | null }) => {
    // Just navigate, don't set as current room yet (let the room page decide based on membership)
    router.push(`/rooms/${room.id}`)
  }

  const onJoinRoom = (room: Room) => {
    setError(null)

    const token = getToken()
    if (!token) {
      setError(copy.loginRequired)
      return
    }

    setCurrentRoom({
      id: room.id,
      name: room.name,
      backgroundGradientKey: room.backgroundGradientKey ?? null,
    })

    router.push(`/rooms/${room.id}?join=1`)
  }

  const onJoinGlobal = () => {
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
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          privacy: createForm.privacy,
        }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? copy.createError)
        return
      }

      const created = (await response.json()) as Room
      setRooms((prev) => [created, ...prev])
      setCreateForm({ name: '', privacy: RoomPrivacy.PUBLIC })

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


  return (
    <div className="community-page garden-page" data-no-translate lang={language}>
      <Navbar compact />
      <main className="community-layout">
        <header className="community-intro">
          <div>
            <p className="community-eyebrow"><Sprout size={15} aria-hidden="true" />{copy.community}</p>
            <h1>{copy.rooms}</h1>
            <p>{copy.roomsHint}</p>
          </div>
          <div className="community-actions">
            <Link href="/" className="community-button"><ArrowLeft size={15} aria-hidden="true" />{copy.back}</Link>
            <button type="button" className="community-button community-button-primary" onClick={() => {
              if (!isProMember) { openPaywallOrRegister(); return }
              setError(null)
              setIsCreateModalOpen(true)
            }}>
              {isProMember ? <Plus size={16} aria-hidden="true" /> : <Lock size={15} aria-hidden="true" />}
              {copy.createRoom}{!isProMember && <span className="community-badge">PRO</span>}
            </button>
          </div>
        </header>

        {error && !isCreateModalOpen && <div className="community-error" role="alert"><p>{error}</p><button type="button" className="community-button" onClick={() => void loadRooms()}>{copy.retry}</button></div>}

        {isRedirecting ? <div className="community-state" role="status"><span className="community-spinner" aria-hidden="true" />{copy.loading}</div> : <>
          <section className="rooms-global" aria-labelledby="global-room-title">
            <div className="rooms-global-symbol"><Globe2 size={30} aria-hidden="true" /></div>
            <div className="rooms-global-copy">
              <h2 id="global-room-title">{copy.global}</h2><p>{copy.globalHint}</p>
            </div>
            <button type="button" className="community-button" onClick={onJoinGlobal} aria-pressed={currentRoomId === null}>
              {currentRoomId === null ? <Check size={16} aria-hidden="true" /> : <ArrowUpRight size={16} aria-hidden="true" />}
              {currentRoomId === null ? copy.selected : copy.join}
            </button>
          </section>

          <section aria-labelledby="room-directory-title">
            <div className="rooms-directory-heading"><h2 id="room-directory-title">{copy.roomDirectory}</h2><span>{!loading && `${rooms.length} ${copy.roomCount}`}</span></div>
            {loading ? <div className="community-state" role="status"><span className="community-spinner" aria-hidden="true" />{copy.loading}</div> : rooms.length === 0 ? (
              <div className="community-panel community-state"><DoorOpen aria-hidden="true" /><h2>{copy.emptyRooms}</h2><p>{copy.emptyRoomsHint}</p></div>
            ) : <div className="rooms-grid">
              {rooms.map(room => {
                const isOwner = user?.id === room.ownerId
                const isSelected = currentRoomId === room.id
                return <article key={room.id} className="room-card" data-current={isSelected}>
                  <div className="room-card-top">
                    <span className="room-card-symbol"><DoorOpen size={22} aria-hidden="true" /></span>
                    <div className="community-actions">
                      <span className="community-badge">{room.privacy === RoomPrivacy.PRIVATE ? <Lock size={11} aria-hidden="true" /> : <Globe2 size={11} aria-hidden="true" />}{room.privacy === RoomPrivacy.PRIVATE ? copy.private : copy.public}</span>
                      {isOwner && <span className="community-badge"><Crown size={11} aria-hidden="true" />{copy.owner}</span>}
                    </div>
                  </div>
                  <div><h3><Link href={`/rooms/${room.id}`}>{room.name}</Link></h3><p className="community-muted">{isSelected ? copy.selected : copy.room}</p></div>
                  <footer className="room-card-footer">
                    <span className="community-muted"><Users size={14} className="inline mr-1" aria-hidden="true" />{room.memberCount ?? 0} {room.memberCount === 1 ? copy.participant : copy.participantPlural}</span>
                    <button type="button" className={`community-button ${isSelected ? '' : 'community-button-primary'}`} onClick={() => isSelected ? onOpenRoom(room) : onJoinRoom(room)}>
                      {isSelected ? copy.open : copy.join}<ArrowUpRight size={14} aria-hidden="true" />
                    </button>
                  </footer>
                </article>
              })}
            </div>}
          </section>
        </>}
      </main>
      <CommunityDialog open={isCreateModalOpen} title={copy.createRoom} description={copy.createHint} busy={creating} onClose={() => setIsCreateModalOpen(false)}>
        <form noValidate onSubmit={onCreateRoom}>
          <label className="community-field"><span>{copy.name}</span>
            <input ref={nameInputRef} value={createForm.name} onChange={event => setCreateForm(s => ({ ...s, name: event.target.value }))} placeholder={copy.roomName} disabled={creating} aria-invalid={error === copy.nameRequired} aria-describedby={error ? 'create-room-error' : undefined} />
          </label>
          <fieldset className="community-privacy" disabled={creating}><legend>{copy.privacy}</legend><div>
            {[RoomPrivacy.PUBLIC, RoomPrivacy.PRIVATE].map(privacy => <label key={privacy}>
              <input type="radio" name="create-room-privacy" value={privacy} checked={createForm.privacy === privacy} onChange={() => setCreateForm(s => ({ ...s, privacy }))} />
              <span>{privacy === RoomPrivacy.PUBLIC ? copy.public : copy.private}<small>{privacy === RoomPrivacy.PUBLIC ? copy.publicHint : copy.privateHint}</small></span>
            </label>)}
          </div></fieldset>
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
