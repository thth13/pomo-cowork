// Recorded cues are bundled locally; sources and CC0 credits live in public/sounds/CREDITS.md.
export const RECORDED_TIMER_SOUNDS = [
  { id: 'small-handbell', en: 'Small handbell', es: 'Campanilla', src: '/sounds/small-handbell.mp3', duration: 5.72 },
  { id: 'bright-handbell', en: 'Bright handbell', es: 'Campanilla brillante', src: '/sounds/bright-handbell.mp3', duration: 6.43 },
  { id: 'bronze-bell', en: 'Bronze bell', es: 'Campana de bronce', src: '/sounds/bronze-bell.mp3', duration: 3.84 },
  { id: 'resonant-bell', en: 'Resonant bell', es: 'Campana resonante', src: '/sounds/resonant-bell.mp3', duration: 5.86 },
  { id: 'reception-bell', en: 'Reception bell', es: 'Campana de recepción', src: '/sounds/reception-bell.mp3', duration: 10.94 },
  { id: 'door-chime', en: 'Door chime', es: 'Timbre de puerta', src: '/sounds/door-chime.mp3', duration: 6.89 },
  { id: 'church-bell', en: 'Church bell', es: 'Campana de iglesia', src: '/sounds/church-bell.mp3', duration: 7.44 },
  { id: 'pendulum-chime', en: 'Pendulum clock chime', es: 'Campanada de reloj', src: '/sounds/pendulum-chime.mp3', duration: 10.51 },
  { id: 'dreamcatcher', en: 'Dreamcatcher chimes', es: 'Campanillas de atrapasueños', src: '/sounds/dreamcatcher.mp3', duration: 6.79 },
  { id: 'soft-gong', en: 'Soft gong', es: 'Gong suave', src: '/sounds/soft-gong.mp3', duration: 12.79 },
] as const

export const TIMER_SOUNDS = [
  { id: 'classic', en: 'Classic', es: 'Clásico' },
  { id: 'bell', en: 'Bell', es: 'Campana' },
  { id: 'chime', en: 'Soft chime', es: 'Carillón suave' },
  { id: 'digital', en: 'Digital', es: 'Digital' },
  { id: 'wood', en: 'Wooden tap', es: 'Toque de madera' },
  ...RECORDED_TIMER_SOUNDS,
] as const

export type TimerSoundId = typeof TIMER_SOUNDS[number]['id']
export const isTimerSoundId = (value: unknown): value is TimerSoundId =>
  TIMER_SOUNDS.some(sound => sound.id === value)
