import { CloudRain, Flame, Wind, Waves, Trees, Coffee, CloudLightning, Radio } from 'lucide-react'

export const ambientSounds = [
  { id: 'rain', src: '/audio/ambient/rain.mp3', icon: CloudRain },
  { id: 'fireplace', src: '/audio/ambient/fireplace.mp3', icon: Flame },
  { id: 'wind', src: '/audio/ambient/wind.mp3', icon: Wind },
  { id: 'ocean', src: '/audio/ambient/ocean.mp3', icon: Waves },
  { id: 'forest', src: '/audio/ambient/forest.mp3', icon: Trees },
  { id: 'cafe', src: '/audio/ambient/cafe.mp3', icon: Coffee },
  { id: 'thunder', src: '/audio/ambient/thunder.mp3', icon: CloudLightning },
  { id: 'brown-noise', src: '/audio/ambient/brown-noise.mp3', icon: Radio },
] as const

export type AmbientSoundId = typeof ambientSounds[number]['id']
export type AmbientPreferences = {
  master: number
  tracks: Record<AmbientSoundId, { enabled: boolean; volume: number }>
}
export const defaultAmbientPreferences = (): AmbientPreferences => ({
  master: 70,
  tracks: Object.fromEntries(ambientSounds.map(({ id }) => [id, { enabled: false, volume: 50 }])) as AmbientPreferences['tracks'],
})
export const ambientVolume = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback
