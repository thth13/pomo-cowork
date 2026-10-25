const BLOB_BASE_URL = process.env.NEXT_PUBLIC_BLOB_BASE_URL

export const BACKGROUNDS = [
  { id: 'default', kind: 'default' },
  { id: 'rainy-window', kind: 'image', src: `${BLOB_BASE_URL}/backgrounds/images/rainy-window.webp`, preview: `${BLOB_BASE_URL}/backgrounds/images/rainy-window-thumb.webp` },
  { id: 'misty-lake', kind: 'image', src: `${BLOB_BASE_URL}/backgrounds/images/misty-lake.webp`, preview: `${BLOB_BASE_URL}/backgrounds/images/misty-lake-thumb.webp` },
  { id: 'sunset-coast', kind: 'image', src: `${BLOB_BASE_URL}/backgrounds/images/sunset-coast.webp`, preview: `${BLOB_BASE_URL}/backgrounds/images/sunset-coast-thumb.webp` },
  { id: 'forest-rain', kind: 'video', src: `${BLOB_BASE_URL}/backgrounds/videos/forest-rain.mp4`, preview: `${BLOB_BASE_URL}/backgrounds/posters/forest-rain.jpg`, source: 'https://mixkit.co/free-stock-video/raining-in-a-cloud-forest-full-of-tall-trees-22728/' },
  { id: 'forest-stream', kind: 'video', src: `${BLOB_BASE_URL}/backgrounds/videos/forest-stream.mp4`, preview: `${BLOB_BASE_URL}/backgrounds/posters/forest-stream.jpg`, source: 'https://mixkit.co/free-stock-video/forest-stream-in-the-sunlight-529/' },
  { id: 'ocean-sunset', kind: 'video', src: `${BLOB_BASE_URL}/backgrounds/videos/ocean-sunset.mp4`, preview: `${BLOB_BASE_URL}/backgrounds/posters/ocean-sunset.jpg`, source: 'https://mixkit.co/free-stock-video/stunning-sunset-seen-from-the-sea-4119/' },
  { id: 'alpine-dawn', kind: 'image', premium: true, src: '/backgrounds/images/alpine-dawn.jpg', preview: '/backgrounds/images/alpine-dawn-thumb.jpg' },
  { id: 'desert-dunes', kind: 'image', premium: true, src: '/backgrounds/images/desert-dunes.jpg', preview: '/backgrounds/images/desert-dunes-thumb.jpg' },
  { id: 'aurora-lake', kind: 'image', premium: true, src: '/backgrounds/images/aurora-lake.jpg', preview: '/backgrounds/images/aurora-lake-thumb.jpg' },
  { id: 'magic-academy', kind: 'image', premium: true, src: '/backgrounds/images/magic-academy-gothic.jpg', preview: '/backgrounds/images/magic-academy-gothic-thumb.jpg' },
  { id: 'pixel-campfire', kind: 'image', premium: true, animation: 'campfire', src: '/backgrounds/images/pixel-campfire.png', preview: '/backgrounds/images/pixel-campfire-thumb.png' },
  { id: 'pixel-autumn', kind: 'image', premium: true, animation: 'autumn', src: '/backgrounds/images/pixel-autumn.png', preview: '/backgrounds/images/pixel-autumn-thumb.png' },
  { id: 'peach-glow', kind: 'image', premium: true, src: '/backgrounds/images/peach-glow.jpg', preview: '/backgrounds/images/peach-glow-thumb.jpg' },
  { id: 'mint-haze', kind: 'image', premium: true, src: '/backgrounds/images/mint-haze.jpg', preview: '/backgrounds/images/mint-haze-thumb.jpg' },
  { id: 'violet-dusk', kind: 'image', premium: true, src: '/backgrounds/images/violet-dusk.jpg', preview: '/backgrounds/images/violet-dusk-thumb.jpg' },
] as const

export const PREMIUM_TIMER_FONTS = ['orbitron', 'space-grotesk', 'cormorant', 'bebas', 'vt323'] as const
export const TIMER_FONTS = ['pixel', 'sans', 'serif', 'mono', 'rounded', ...PREMIUM_TIMER_FONTS] as const
export const PLAY_BACKGROUND_EVENT = 'pomo:play-background'
export type BackgroundId = (typeof BACKGROUNDS)[number]['id']
export type TimerFont = (typeof TIMER_FONTS)[number]

export function isAnimatedBackground(background: (typeof BACKGROUNDS)[number]): boolean {
  return background.kind === 'video' || 'animation' in background
}

export function isPremiumBackground(id: BackgroundId): boolean {
  const background = BACKGROUNDS.find(item => item.id === id)
  return Boolean(background && 'premium' in background && background.premium)
}

export function isPremiumTimerFont(font: TimerFont): boolean {
  return PREMIUM_TIMER_FONTS.some(premiumFont => premiumFont === font)
}

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
