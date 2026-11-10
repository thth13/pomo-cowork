'use client'

import useSWR from 'swr'
import { ArrowLeftRight, LockKeyhole } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useRoomStore } from '@/store/useRoomStore'
import { useTimerStore } from '@/store/useTimerStore'
import { communityCopy } from '@/lib/i18n/community'
import type { Room } from '@/types'
import { useI18n } from './I18nProvider'

export default function RoomSwitch() {
  const { t, language } = useI18n()
  const copy = communityCopy[language]
  const token = useAuthStore(state => state.token)
  const { currentRoomId, currentRoomName, setCurrentRoom, resetToGlobal } = useRoomStore()
  const disabled = useTimerStore(state => Boolean(state.isRunning && state.currentSession))
  const { data, error, isLoading, mutate } = useSWR<{ rooms: Room[] }>(
    token ? ['/api/rooms/mine', token] : null,
    async ([url, authToken]: [string, string]) => {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${authToken}` }, cache: 'no-store' })
      if (!response.ok) throw new Error('Could not load workspaces')
      return response.json()
    },
    { revalidateOnFocus: true, shouldRetryOnError: false }
  )

  const rooms = data?.rooms ?? []
  const name = currentRoomId ? currentRoomName : t.room.global

  if (!currentRoomId && !isLoading && !error && rooms.length === 0) return null

  const currentIndex = rooms.findIndex(room => room.id === currentRoomId)
  const nextRoom = currentRoomId
    ? currentIndex >= 0 ? rooms[currentIndex + 1] : undefined
    : rooms[0]
  const hint = disabled ? t.room.stopToSwitch
    : isLoading ? copy.loading
      : error ? `${copy.roomsLoadError} ${copy.retry}`
        : `${t.room.switchTo} ${nextRoom?.name ?? t.room.global}`
  const Icon = disabled ? LockKeyhole : ArrowLeftRight

  return (
    <button
      type="button"
      className="workspace-room-switch"
      disabled={disabled || isLoading}
      title={`${t.room.label}: ${name}. ${hint}`}
      aria-label={`${t.room.label}: ${name}. ${hint}`}
      aria-busy={isLoading}
      onClick={() => {
        const timer = useTimerStore.getState()
        if (timer.isRunning && timer.currentSession) return
        if (error) { void mutate(); return }
        if (nextRoom) setCurrentRoom({ id: nextRoom.id, name: nextRoom.name, backgroundGradientKey: nextRoom.backgroundGradientKey ?? null })
        else resetToGlobal()
      }}
    >
      <span>{t.room.label}: {name}{error ? ` · ${copy.retry}` : ''}</span>
      <Icon size={13} strokeWidth={1.5} aria-hidden="true" />
    </button>
  )
}
