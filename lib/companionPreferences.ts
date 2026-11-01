export const COMPANION_STORAGE_KEY = 'pomo:walking-companion:v1'
export const companionDefaults = { visible: true, wandering: true, animations: true, x: 0.2, y: 0.8 }
export type CompanionPreferences = typeof companionDefaults
export const companionKeys = ['visible', 'wandering', 'animations', 'x', 'y'] as const

export function companionPatch(value: unknown): Partial<CompanionPreferences> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const raw = value as Record<string, unknown>
  const patch: Partial<CompanionPreferences> = {}
  for (const key of ['visible', 'wandering', 'animations'] as const) if (typeof raw[key] === 'boolean') patch[key] = raw[key]
  for (const key of ['x', 'y'] as const) if (typeof raw[key] === 'number' && Number.isFinite(raw[key]) && raw[key] >= 0 && raw[key] <= 1) patch[key] = raw[key]
  return patch
}
