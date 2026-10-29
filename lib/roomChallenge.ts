export const MIN_ROOM_CHALLENGE_MINUTES = 5
export const MAX_ROOM_CHALLENGE_MINUTES = 480

export interface RoomDailyChallenge {
  title: string
  targetMinutes: number
  date: string
  resetsAt: string
  participants: Array<{
    id: string
    username: string
    avatarUrl: string | null
    minutes: number
  }>
}
