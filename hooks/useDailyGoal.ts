'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'

export type DayGoalType = 'pomodoros' | 'time'
export interface DailyGoal {
  type: DayGoalType
  value: number
}

export const DEFAULT_DAY_GOAL = 4
export const DEFAULT_TIME_GOAL = 2
const GOAL_CHANGED_EVENT = 'daily-goal-changed'

export function isValidDailyGoal(goal: unknown): goal is DailyGoal {
  if (!goal || typeof goal !== 'object') return false
  const candidate = goal as Partial<DailyGoal>
  if (typeof candidate.value !== 'number' || !Number.isFinite(candidate.value)) return false
  return candidate.type === 'pomodoros'
    ? Number.isInteger(candidate.value) && candidate.value >= 1 && candidate.value <= 99
    : candidate.type === 'time' && candidate.value >= 0.5 && candidate.value <= 24
}

function parseGoal(raw: string | null): DailyGoal | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    // Older versions stored only the number of Pomodoros.
    const goal = typeof parsed === 'number' ? { type: 'pomodoros', value: parsed } : parsed
    return isValidDailyGoal(goal) ? goal : null
  } catch {
    return null
  }
}

interface GoalSnapshot {
  key: string
  goal: DailyGoal | null
  error: 'storage' | null
}

export function useDailyGoal() {
  const userId = useAuthStore(state => state.user?.id)
  const storageKey = `day_goal_${userId ?? 'guest'}`
  const [snapshot, setSnapshot] = useState<GoalSnapshot | null>(null)

  useEffect(() => {
    const read = () => {
      try {
        setSnapshot({ key: storageKey, goal: parseGoal(window.localStorage.getItem(storageKey)), error: null })
      } catch {
        setSnapshot(previous => ({
          key: storageKey,
          goal: previous?.key === storageKey ? previous.goal : null,
          error: 'storage',
        }))
      }
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) read()
    }
    const onGoalChanged = (event: Event) => {
      if ((event as CustomEvent<string>).detail === storageKey) read()
    }
    read()
    window.addEventListener('storage', onStorage)
    window.addEventListener(GOAL_CHANGED_EVENT, onGoalChanged)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(GOAL_CHANGED_EVENT, onGoalChanged)
    }
  }, [storageKey])

  const persist = useCallback((goal: DailyGoal | null) => {
    try {
      if (goal) window.localStorage.setItem(storageKey, JSON.stringify(goal))
      else window.localStorage.removeItem(storageKey)
      setSnapshot({ key: storageKey, goal, error: null })
      window.dispatchEvent(new CustomEvent(GOAL_CHANGED_EVENT, { detail: storageKey }))
      return true
    } catch {
      setSnapshot(previous => ({
        key: storageKey,
        goal: previous?.key === storageKey ? previous.goal : null,
        error: 'storage',
      }))
      return false
    }
  }, [storageKey])

  const saveGoal = useCallback((goal: DailyGoal) => isValidDailyGoal(goal) && persist(goal), [persist])
  const removeGoal = useCallback(() => persist(null), [persist])
  const clearError = useCallback(() => {
    setSnapshot(previous => previous?.key === storageKey ? { ...previous, error: null } : previous)
  }, [storageKey])

  return {
    goal: snapshot?.key === storageKey ? snapshot.goal : null,
    isLoaded: snapshot?.key === storageKey,
    error: snapshot?.key === storageKey ? snapshot.error : null,
    saveGoal,
    removeGoal,
    clearError,
  }
}
