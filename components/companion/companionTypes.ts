export type CompanionMood = 'idle' | 'focus' | 'break'
export interface CompanionPose {
  mood: CompanionMood
  walking: boolean
  direction: number
  reducedMotion: boolean
  hovered?: boolean
  speaking?: boolean
  /** Point in CSS pixels, relative to the companion actor. */
  pointAt?: { x: number; y: number }
  celebrateUntil?: number
  held?: boolean
  dragVelocity?: number
}
