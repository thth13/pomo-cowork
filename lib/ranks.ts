export const EXPERIENCE_PER_MINUTE = 4
export const STREAK_BONUS_PER_DAY = 0.05
export const MAX_STREAK_BONUS = 1

export const RANKS = [
  {
    id: 'bronze',
    name: 'Bronze',
    minExperience: 0,
    color: '#b87545',
    ring: 'linear-gradient(135deg, #9a5b32 0%, #b87545 35%, #d49a68 70%, #e8bb8d 100%)',
  },
  {
    id: 'silver',
    name: 'Silver',
    minExperience: 1_000,
    color: '#8995a6',
    ring: 'linear-gradient(135deg, #8995a6 0%, #aeb7c4 35%, #d5dae1 70%, #a8b2c0 100%)',
  },
  {
    id: 'gold',
    name: 'Gold',
    minExperience: 3_000,
    color: '#c58a2c',
    ring: 'linear-gradient(135deg, #c58a2c 0%, #dba744 35%, #edc96d 70%, #d9a43d 100%)',
  },
  {
    id: 'platinum',
    name: 'Platinum',
    minExperience: 7_000,
    color: '#8ca6b3',
    ring: 'linear-gradient(135deg, #8ca6b3 0%, #a8c4ce 35%, #cce3e8 70%, #9ccbd3 100%)',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    minExperience: 15_000,
    color: '#2d8068',
    ring: 'linear-gradient(135deg, #2d8068 0%, #45a080 35%, #70bea0 70%, #9dd6bd 100%)',
  },
  {
    id: 'diamond',
    name: 'Diamond',
    minExperience: 30_000,
    color: '#568dc9',
    ring: 'linear-gradient(135deg, #568dc9 0%, #70acd4 35%, #94c9df 70%, #bee3ed 100%)',
  },
  {
    id: 'master',
    name: 'Master',
    minExperience: 60_000,
    color: '#77549a',
    ring: 'linear-gradient(135deg, #77549a 0%, #956db1 35%, #b58bc8 70%, #d1addc 100%)',
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    minExperience: 100_000,
    color: '#a34f52',
    ring: 'linear-gradient(135deg, #a34f52 0%, #bd6664 35%, #d77f72 70%, #e8a080 100%)',
  },
  {
    id: 'champion',
    name: 'Champion',
    minExperience: 160_000,
    color: '#9d83bd',
    ring: 'linear-gradient(135deg, #d8b45f 0%, #d89a83 25%, #c486a7 50%, #9d83bd 75%, #75adc2 100%)',
  },
] as const

export type RankId = (typeof RANKS)[number]['id']
export type Rank = (typeof RANKS)[number]

export const getRank = (experience = 0): Rank => {
  const normalizedExperience = Math.max(0, experience)

  for (let index = RANKS.length - 1; index >= 0; index -= 1) {
    if (normalizedExperience >= RANKS[index].minExperience) {
      return RANKS[index]
    }
  }

  return RANKS[0]
}

export const getRankProgress = (experience = 0) => {
  const normalizedExperience = Math.max(0, experience)
  const rank = getRank(normalizedExperience)
  const rankIndex = RANKS.findIndex(({ id }) => id === rank.id)
  const nextRank = RANKS[rankIndex + 1] ?? null

  if (!nextRank) {
    return {
      rank,
      nextRank: null,
      current: normalizedExperience,
      required: normalizedExperience,
      remaining: 0,
      percent: 100,
    }
  }

  const current = Math.max(0, normalizedExperience - rank.minExperience)
  const required = nextRank.minExperience - rank.minExperience

  return {
    rank,
    nextRank,
    current,
    required,
    remaining: Math.max(0, nextRank.minExperience - normalizedExperience),
    percent: Math.min(100, Math.round((current / required) * 100)),
  }
}

export const calculateExperienceReward = (minutes: number, streak: number): number => {
  const baseExperience = Math.max(0, Math.round(minutes)) * EXPERIENCE_PER_MINUTE
  const streakBonus = Math.min(
    Math.max(0, streak - 1) * STREAK_BONUS_PER_DAY,
    MAX_STREAK_BONUS
  )

  return Math.round(baseExperience * (1 + streakBonus))
}

export const getUtcDayStart = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

export const getNextStreak = (
  currentStreak: number,
  lastStreakDate: Date | null,
  completedAt: Date
): number => {
  if (!lastStreakDate) {
    return 1
  }

  const currentDay = getUtcDayStart(completedAt).getTime()
  const lastDay = getUtcDayStart(lastStreakDate).getTime()
  const differenceInDays = Math.round((currentDay - lastDay) / 86_400_000)

  if (differenceInDays <= 0) {
    return Math.max(1, currentStreak)
  }

  return differenceInDays === 1 ? Math.max(1, currentStreak) + 1 : 1
}
