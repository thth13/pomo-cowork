export const focusPreferenceKeys = ['minimalTimer', 'offline', 'hideRoomSwitch'] as const
export type FocusPreferenceKey = typeof focusPreferenceKeys[number]
export type FocusPreferences = Record<FocusPreferenceKey, boolean>
export const defaultFocusPreferences: FocusPreferences = { minimalTimer: false, offline: false, hideRoomSwitch: false }

export function readFocusPreferences(value: unknown): FocusPreferences {
  const data = value && typeof value === 'object' ? value as Partial<FocusPreferences> : {}
  return { minimalTimer: data.minimalTimer === true, offline: data.offline === true, hideRoomSwitch: data.hideRoomSwitch === true }
}
