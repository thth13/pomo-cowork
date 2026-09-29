const BLOB_BASE_URL = process.env.NEXT_PUBLIC_BLOB_BASE_URL

export const BACKGROUNDS = [
  { id: 'default', kind: 'default' },
  { id: 'rainy-window', kind: 'image', src: `${BLOB_BASE_URL}/backgrounds/images/rainy-window.webp`, preview: `${BLOB_BASE_URL}/backgrounds/images/rainy-window-thumb.webp` },
  { id: 'misty-lake', kind: 'image', src: `${BLOB_BASE_URL}/backgrounds/images/misty-lake.webp`, preview: `${BLOB_BASE_URL}/backgrounds/images/misty-lake-thumb.webp` },
  { id: 'sunset-coast', kind: 'image', src: `${BLOB_BASE_URL}/backgrounds/images/sunset-coast.webp`, preview: `${BLOB_BASE_URL}/backgrounds/images/sunset-coast-thumb.webp` },
  { id: 'forest-rain', kind: 'video', src: `${BLOB_BASE_URL}/backgrounds/videos/forest-rain.mp4`, preview: `${BLOB_BASE_URL}/backgrounds/posters/forest-rain.jpg`, source: 'https://mixkit.co/free-stock-video/raining-in-a-cloud-forest-full-of-tall-trees-22728/' },
  { id: 'forest-stream', kind: 'video', src: `${BLOB_BASE_URL}/backgrounds/videos/forest-stream.mp4`, preview: `${BLOB_BASE_URL}/backgrounds/posters/forest-stream.jpg`, source: 'https://mixkit.co/free-stock-video/forest-stream-in-the-sunlight-529/' },
  { id: 'ocean-sunset', kind: 'video', src: `${BLOB_BASE_URL}/backgrounds/videos/ocean-sunset.mp4`, preview: `${BLOB_BASE_URL}/backgrounds/posters/ocean-sunset.jpg`, source: 'https://mixkit.co/free-stock-video/stunning-sunset-seen-from-the-sea-4119/' },
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
