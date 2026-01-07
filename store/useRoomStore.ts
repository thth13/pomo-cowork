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

  setCurrentRoom: (room: { id: string; name: string } | null) => void
  resetToGlobal: () => void
}

const GLOBAL_ROOM_NAME = 'Global'

export const useRoomStore = create<RoomStore>()(
  persist(
    (set) => ({
      currentRoomId: null,
      currentRoomName: GLOBAL_ROOM_NAME,

      setCurrentRoom: (room) => {
        if (!room) {
          set({ currentRoomId: null, currentRoomName: GLOBAL_ROOM_NAME })
          return
        }
        set({ currentRoomId: room.id, currentRoomName: room.name })
      },

      resetToGlobal: () => {
        set({ currentRoomId: null, currentRoomName: GLOBAL_ROOM_NAME })
      },
    }),
    {
      name: 'room-storage',
    }
  )
)
