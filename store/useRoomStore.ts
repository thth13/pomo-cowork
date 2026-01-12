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

      setCurrentRoom: (room) => {
        if (!room) {
          set({ currentRoomId: null, currentRoomName: GLOBAL_ROOM_NAME, currentRoomBackgroundGradientKey: null })
          return
        }
        set({
          currentRoomId: room.id,
          currentRoomName: room.name,
          currentRoomBackgroundGradientKey: room.backgroundGradientKey ?? null,
        })
      },

      resetToGlobal: () => {
        set({ currentRoomId: null, currentRoomName: GLOBAL_ROOM_NAME, currentRoomBackgroundGradientKey: null })
      },
    }),
    {
      name: 'room-storage',
    }
  )
)
