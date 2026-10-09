import { useAuthStore } from '@/store/useAuthStore'
import { useTimerStore } from '@/store/useTimerStore'

export interface TimerDurations {
  workDuration: number
  shortBreak: number
  longBreak: number
  longBreakAfter: number
}

export const TIMER_SETTINGS_STORAGE_KEY = 'pomodoro:timerSettings'

const limits = { workDuration: [1, 60], shortBreak: [1, 30], longBreak: [1, 60], longBreakAfter: [2, 10] }
let savePending = false
export const isTimerSettingsSavePending = () => savePending

export function isValidTimerDurations(value: unknown): value is TimerDurations {
  if (!value || typeof value !== 'object') return false
  const settings = value as TimerDurations
  return (Object.keys(limits) as (keyof TimerDurations)[]).every(key => {
    const [min, max] = limits[key]
    return Number.isInteger(settings[key]) && settings[key] >= min && settings[key] <= max
  })
}

async function persistTimerDurations(settings: TimerDurations, preferences: { soundEnabled?: boolean; soundVolume?: number; notificationsEnabled?: boolean }) {
  if (!isValidTimerDurations(settings)) throw new Error('INVALID_SETTINGS')
  const { user, token, updateUserSettings } = useAuthStore.getState()
  if (user && !user.isAnonymous) {
    if (!token) throw new Error('SAVE_FAILED')
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...settings, ...preferences }),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error('SAVE_FAILED')
    const auth = useAuthStore.getState()
    if (auth.user?.id !== user.id || auth.token !== token) throw new Error('STALE')
  } else {
    // Guests have no authenticated settings API; keep their durations on the site.
    localStorage.setItem(TIMER_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  }
  useTimerStore.getState().setTimerSettings(settings)
  if (user) updateUserSettings({ ...settings, ...preferences })
}

export async function saveTimerDurations(settings: TimerDurations, preferences: { soundEnabled?: boolean; soundVolume?: number; notificationsEnabled?: boolean } = {}) {
  if (savePending) throw new Error('BUSY')
  savePending = true
  try { await persistTimerDurations(settings, preferences) }
  finally { savePending = false }
}
