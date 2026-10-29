'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { RoomPrivacy } from '@/types'
import { useTimerStore } from './useTimerStore'

export interface RoomSummary {
  id: string
  name: string
  privacy: RoomPrivacy
  ownerId: string
}

interface RoomStore {
  currentRoomId: string | null
  currentRoomName: string
  currentRoomBackgroundGradientKey: string | null

  lastRoomId: string | null
  lastRoomName: string
  lastRoomBackgroundGradientKey: string | null

  setCurrentRoom: (room: { id: string; name: string; backgroundGradientKey?: string | null } | null) => void
  resetToGlobal: () => void
}

const GLOBAL_ROOM_NAME = 'Global'

export const useRoomStore = create<RoomStore>()(
  persist(
    (set) => ({
      currentRoomId: null,
      currentRoomName: GLOBAL_ROOM_NAME,
      currentRoomBackgroundGradientKey: null,

      lastRoomId: null,
      lastRoomName: '',
      lastRoomBackgroundGradientKey: null,

      setCurrentRoom: (room) => {
        const { isRunning, currentSession } = useTimerStore.getState()
        // Membership changes must not move a running timer to another room.
        if (isRunning && currentSession && (currentSession.roomId ?? null) !== (room?.id ?? null)) {
          if (room) {
            set({
              lastRoomId: room.id,
              lastRoomName: room.name,
              lastRoomBackgroundGradientKey: room.backgroundGradientKey ?? null,
            })
          }
          return
        }

        if (!room) {
          // Explicitly clearing the current room (e.g. leaving/deleting) also clears the last room.
          set({
            currentRoomId: null,
            currentRoomName: GLOBAL_ROOM_NAME,
            currentRoomBackgroundGradientKey: null,
            lastRoomId: null,
            lastRoomName: '',
            lastRoomBackgroundGradientKey: null,
          })
          return
        }
        set({
          currentRoomId: room.id,
          currentRoomName: room.name,
          currentRoomBackgroundGradientKey: room.backgroundGradientKey ?? null,
          lastRoomId: room.id,
          lastRoomName: room.name,
          lastRoomBackgroundGradientKey: room.backgroundGradientKey ?? null,
        })
      },

      resetToGlobal: () => {
        const { isRunning, currentSession } = useTimerStore.getState()
        if (isRunning && currentSession?.roomId) return

        // Switch to Global but keep lastRoom* so UI can toggle back.
        set({ currentRoomId: null, currentRoomName: GLOBAL_ROOM_NAME, currentRoomBackgroundGradientKey: null })
      },
    }),
    {
      name: 'room-storage',
    }
  )
)
