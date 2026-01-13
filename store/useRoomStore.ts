'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { RoomPrivacy } from '@/types'

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
        // Switch to Global but keep lastRoom* so UI can toggle back.
        set({ currentRoomId: null, currentRoomName: GLOBAL_ROOM_NAME, currentRoomBackgroundGradientKey: null })
      },
    }),
    {
      name: 'room-storage',
    }
  )
)
