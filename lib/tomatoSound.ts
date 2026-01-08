// Звуковые эффекты для броска помидора
// Используем Web Audio API для генерации звуков без файлов

let audioContext: AudioContext | null = null

const getAudioContext = () => {
  if (!audioContext && typeof window !== 'undefined') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

// Звук свиста летящего помидора
export const playTomatoThrowSound = () => {
  const ctx = getAudioContext()
  if (!ctx) return

  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  // Частота свиста, увеличивающаяся при полете
  oscillator.frequency.setValueAtTime(400, ctx.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3)

  // Громкость
  gainNode.gain.setValueAtTime(0.08, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

  oscillator.type = 'sine'
  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 0.3)
}

// Звук разбивающегося помидора (сплэш)
export const playTomatoSplashSound = () => {
  const ctx = getAudioContext()
  if (!ctx) return

  // Основной удар (низкая частота)
  const impact = ctx.createOscillator()
  const impactGain = ctx.createGain()
  
  impact.connect(impactGain)
  impactGain.connect(ctx.destination)
  
  impact.frequency.setValueAtTime(100, ctx.currentTime)
  impact.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1)
  
  impactGain.gain.setValueAtTime(0.15, ctx.currentTime)
  impactGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
  
  impact.type = 'triangle'
  impact.start(ctx.currentTime)
  impact.stop(ctx.currentTime + 0.15)

  // Шум разбрызгивания (white noise)
  const bufferSize = ctx.sampleRate * 0.2 // 0.2 секунды
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  
  const noise = ctx.createBufferSource()
  const noiseGain = ctx.createGain()
  const noiseFilter = ctx.createBiquadFilter()
  
  noise.buffer = buffer
  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  
  noiseFilter.type = 'lowpass'
  noiseFilter.frequency.setValueAtTime(3000, ctx.currentTime)
  noiseFilter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2)
  
  noiseGain.gain.setValueAtTime(0.1, ctx.currentTime)
  noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
  
  noise.start(ctx.currentTime)
  noise.stop(ctx.currentTime + 0.2)

  // Дополнительный "сочный" звук
  const splash = ctx.createOscillator()
  const splashGain = ctx.createGain()
  
  splash.connect(splashGain)
  splashGain.connect(ctx.destination)
  
  splash.frequency.setValueAtTime(200, ctx.currentTime + 0.05)
  splash.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25)
  
  splashGain.gain.setValueAtTime(0.12, ctx.currentTime + 0.05)
  splashGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
  
  splash.type = 'sawtooth'
  splash.start(ctx.currentTime + 0.05)
  splash.stop(ctx.currentTime + 0.25)
}
