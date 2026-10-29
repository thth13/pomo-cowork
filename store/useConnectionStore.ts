import { create } from 'zustand'

interface ConnectionState {
  isConnected: boolean
  isChecking: boolean
  onlineUserIds: Record<string, true>
  onlineUserCount: number
  anonymousOnlineCount: number
  totalOnlineCount: number
  setIsChecking: (isChecking: boolean) => void
  setConnectionStatus: (isConnected: boolean) => void
  setOnlineUsersFromList: (userIds: string[], anonymousIds?: string[]) => void
  setPresenceCounts: (counts: { userCount?: number; anonymousCount?: number; total?: number }) => void
  updateUserPresence: (userId: string, online: boolean) => void
  resetPresence: () => void
  forceResetPresence: () => Promise<void>
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  isConnected: false,
  isChecking: true,
  onlineUserIds: {},
  onlineUserCount: 0,
  anonymousOnlineCount: 0,
  totalOnlineCount: 0,
  setIsChecking: (isChecking) => set({ isChecking }),
  setConnectionStatus: (isConnected) => set({ isConnected, isChecking: false }),
  setOnlineUsersFromList: (userIds, anonymousIds = []) => {
    const normalized = [...userIds, ...anonymousIds].reduce<Record<string, true>>((acc, id) => {
      acc[id] = true
      return acc
    }, {})

    set((state) => {
      const userCount = userIds.length
      return {
        onlineUserIds: normalized,
        onlineUserCount: userCount,
        totalOnlineCount: userCount + state.anonymousOnlineCount
      }
    })
  },
  setPresenceCounts: ({ userCount, anonymousCount, total }) => set((state) => {
    const nextUserCount = userCount ?? state.onlineUserCount
    const nextAnonymousCount = anonymousCount ?? state.anonymousOnlineCount
    const nextTotal = total ?? nextUserCount + nextAnonymousCount

    return {
      onlineUserCount: nextUserCount,
      anonymousOnlineCount: nextAnonymousCount,
      totalOnlineCount: nextTotal
    }
  }),
  updateUserPresence: (userId, online) => set((state) => {
    const next = { ...state.onlineUserIds }

    if (online) {
      next[userId] = true
    } else {
      delete next[userId]
    }

    // Incremental user-online events are for registered accounts only.
    // The shared ID lookup also contains guests from the presence snapshot.
    const wasOnline = state.onlineUserIds[userId] === true
    const userCount = Math.max(0, state.onlineUserCount + Number(online) - Number(wasOnline))
    return {
      onlineUserIds: next,
      onlineUserCount: userCount,
      totalOnlineCount: userCount + state.anonymousOnlineCount
    }
  }),
  resetPresence: () => set({
    onlineUserIds: {},
    onlineUserCount: 0,
    anonymousOnlineCount: 0,
    totalOnlineCount: 0
  }),
  forceResetPresence: async () => {
    try {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'
      await fetch(`${socketUrl}/admin/reset-presence`, { method: 'POST' })
      set({
        onlineUserIds: {},
        onlineUserCount: 0,
        anonymousOnlineCount: 0,
        totalOnlineCount: 0
      })
    } catch (error) {
      console.error('Failed to reset presence:', error)
    }
  }
}))

