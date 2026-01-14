'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Crown, Lock } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { PaywallModal } from '@/components/PaywallModal'
import { useAuthStore } from '@/store/useAuthStore'
import { useRoomStore } from '@/store/useRoomStore'
import { Room, RoomPrivacy } from '@/types'

interface RoomFormState {
  name: string
  privacy: RoomPrivacy
}

const RoomsListSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 animate-pulse"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="h-5 w-40 bg-gray-200 dark:bg-slate-700 rounded" />
              <div className="h-5 w-16 bg-gray-200 dark:bg-slate-700 rounded-full" />
              <div className="h-5 w-14 bg-gray-200 dark:bg-slate-700 rounded-full" />
            </div>
            <div className="mt-2 h-3 w-24 bg-gray-200 dark:bg-slate-700 rounded" />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="h-10 w-24 bg-gray-200 dark:bg-slate-700 rounded-lg" />
            <div className="h-10 w-24 bg-gray-200 dark:bg-slate-700 rounded-lg" />
          </div>
        </div>
      </div>
    ))}
  </div>
)

export default function RoomsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuthStore()
  const { currentRoomId, currentRoomName, setCurrentRoom, resetToGlobal } = useRoomStore()

  const shouldForceList = searchParams.get('list') === '1'

  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const [isPaywallOpen, setIsPaywallOpen] = useState(false)

  const [createForm, setCreateForm] = useState<RoomFormState>({
    name: '',
    privacy: RoomPrivacy.PUBLIC,
  })

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

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
        setError('Failed to load rooms')
        return
      }

      const data = (await response.json()) as Room[]
      setRooms(data)
    } catch (e) {
      console.error('Failed to load rooms:', e)
      setError('Failed to load rooms')
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

              setCurrentRoom({
                id: target.id,
                name: target.name,
                backgroundGradientKey: target.backgroundGradientKey ?? null,
              })

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
      setError('Login required to join a room')
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
    setError(null)

    const token = getToken()
    if (!token) {
      setError('Login required to create a room')
      return
    }

    const name = createForm.name.trim()
    if (!name) {
      setError('Room name is required')
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
        setError(data?.error ?? 'Failed to create room')
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
      setError('Failed to create room')
    } finally {
      setCreating(false)
    }
  }


  const privacyLabel = (privacy: RoomPrivacy) => {
    return privacy === RoomPrivacy.PRIVATE ? 'Private' : 'Public'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Rooms</h1>
            <p className="text-gray-600 dark:text-slate-300">
              Current: <span className="font-semibold">{currentRoomName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPaywallOpen(true)}
                aria-disabled="true"
                className="px-4 py-2 rounded-lg font-medium bg-red-500 text-white opacity-60 cursor-pointer transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Create room
                </span>
              </button>

              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
                <Crown className="w-3 h-3" />
                <span>PRO</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        {isRedirecting ? (
          <RoomsListSkeleton />
        ) : (
        <div className="space-y-3 mb-8">
          <div
            role="button"
            tabIndex={0}
            onClick={onJoinGlobal}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onJoinGlobal()
            }}
            className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">Global</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">Default room</div>
            </div>
            <button
              type="button"
              onClick={onJoinGlobal}
              onClickCapture={(e) => e.stopPropagation()}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentRoomId === null
                  ? 'bg-red-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {currentRoomId === null ? 'Selected' : 'Join'}
            </button>
          </div>

          {loading ? (
            <RoomsListSkeleton />
          ) : rooms.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-slate-400">No rooms yet</div>
          ) : (
            rooms.map((room) => {
              const isOwner = user?.id && room.ownerId === user.id
              const isSelected = currentRoomId === room.id

              return (
                <div
                  key={room.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenRoom({ id: room.id, name: room.name, backgroundGradientKey: room.backgroundGradientKey ?? null })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onOpenRoom({ id: room.id, name: room.name, backgroundGradientKey: room.backgroundGradientKey ?? null })
                    }
                  }}
                  className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-gray-900 dark:text-white truncate">{room.name}</div>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                          {privacyLabel(room.privacy)}
                        </span>
                        {isOwner && (
                          <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                            Owner
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">
                        {room.memberCount ?? 0} {room.memberCount === 1 ? 'участник' : 'участников'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isSelected) {
                            onOpenRoom({
                              id: room.id,
                              name: room.name,
                              backgroundGradientKey: room.backgroundGradientKey ?? null,
                            })
                            return
                          }

                          void onJoinRoom(room)
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          isSelected
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Join'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
        )}
      </main>

      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsCreateModalOpen(false)
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Create room</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  Pick a name and privacy.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            <form onSubmit={onCreateRoom} className="grid grid-cols-1 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300">Name</span>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Room name"
                  className="mt-1 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                  autoFocus
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300">Privacy</span>
                <select
                  value={createForm.privacy}
                  onChange={(e) => setCreateForm((s) => ({ ...s, privacy: e.target.value as RoomPrivacy }))}
                  className="mt-1 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value={RoomPrivacy.PUBLIC}>Public</option>
                  <option value={RoomPrivacy.PRIVATE}>Private</option>
                </select>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!user || creating}
                  className="px-4 py-2 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPaywallOpen && <PaywallModal onClose={() => setIsPaywallOpen(false)} />}
    </div>
  )
}
