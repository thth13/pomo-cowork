export const MIN_ROOM_CHALLENGE_MINUTES = 5
// Storage boundary of Prisma Int, not a product limit on the daily goal.
const MAX_STORED_MINUTES = 2_147_483_647

export function isValidRoomChallengeMinutes(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
    && value >= MIN_ROOM_CHALLENGE_MINUTES && value <= MAX_STORED_MINUTES
}

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
