export const BACKGROUNDS = [
  { id: 'default', kind: 'default' },
  { id: 'rainy-window', kind: 'image', src: '/backgrounds/images/rainy-window.jpg', preview: '/backgrounds/images/rainy-window-thumb.jpg' },
  { id: 'misty-lake', kind: 'image', src: '/backgrounds/images/misty-lake.jpg', preview: '/backgrounds/images/misty-lake-thumb.jpg' },
  { id: 'sunset-coast', kind: 'image', src: '/backgrounds/images/sunset-coast.jpg', preview: '/backgrounds/images/sunset-coast-thumb.jpg' },
  { id: 'forest-rain', kind: 'video', src: '/backgrounds/videos/forest-rain.mp4', preview: '/backgrounds/posters/forest-rain.jpg', source: 'https://mixkit.co/free-stock-video/raining-in-a-cloud-forest-full-of-tall-trees-22728/' },
  { id: 'forest-stream', kind: 'video', src: '/backgrounds/videos/forest-stream.mp4', preview: '/backgrounds/posters/forest-stream.jpg', source: 'https://mixkit.co/free-stock-video/forest-stream-in-the-sunlight-529/' },
  { id: 'ocean-sunset', kind: 'video', src: '/backgrounds/videos/ocean-sunset.mp4', preview: '/backgrounds/posters/ocean-sunset.jpg', source: 'https://mixkit.co/free-stock-video/stunning-sunset-seen-from-the-sea-4119/' },
] as const

export const TIMER_FONTS = ['pixel', 'sans', 'serif', 'mono', 'rounded'] as const
export const PLAY_BACKGROUND_EVENT = 'pomo:play-background'
export type BackgroundId = (typeof BACKGROUNDS)[number]['id']
export type TimerFont = (typeof TIMER_FONTS)[number]

export const DEFAULT_APPEARANCE = {
  backgroundId: 'default' as BackgroundId,
  timerFont: 'pixel' as TimerFont,
  videoPaused: false,
}

export function parseAppearance(value: unknown): typeof DEFAULT_APPEARANCE {
  const saved = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    backgroundId: BACKGROUNDS.find(background => background.id === saved.backgroundId)?.id ?? 'default',
    timerFont: TIMER_FONTS.find(font => font === saved.timerFont) ?? 'pixel',
    videoPaused: saved.videoPaused === true,
  }
}
