import { isTimerSoundId, RECORDED_TIMER_SOUNDS } from './timerSounds'

let audioContext: AudioContext | null = null
const buffers = new Map<string, Promise<AudioBuffer>>()
const activeSources = new Set<AudioScheduledSourceNode>()
let playbackVersion = 0
let playbackEnd = 0
let playbackQueue: Promise<void> = Promise.resolve()

type ExtendedWindow = Window & { webkitAudioContext?: typeof AudioContext }

const ensureAudioContext = () => {
  if (typeof window === 'undefined') return null
  if (!audioContext || audioContext.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as ExtendedWindow).webkitAudioContext
    if (!AudioContextClass) return null
    audioContext = new AudioContextClass()
  }
  return audioContext
}

const stopActiveSources = () => {
  for (const source of activeSources) {
    try { source.stop() } catch { /* Source may already have ended. */ }
  }
  activeSources.clear()
}

const trackSource = (source: AudioScheduledSourceNode, gain: GainNode) => {
  activeSources.add(source)
  source.onended = () => {
    activeSources.delete(source)
    source.disconnect()
    gain.disconnect()
  }
}

const playTone = (context: AudioContext, frequency: number, at: number, duration: number, volume: number, type: OscillatorType) => {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, at)
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(volume, at + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  oscillator.connect(gain)
  gain.connect(context.destination)
  trackSource(oscillator, gain)
  oscillator.start(at)
  oscillator.stop(at + duration)
}

const playSynthesized = (context: AudioContext, sound: 'bell' | 'chime' | 'digital' | 'wood', type: 'start' | 'end', volume: number, now: number) => {
  const ascending = type === 'start'
  if (sound === 'bell') {
    const frequency = ascending ? 880 : 660
    playTone(context, frequency, now, 1.1, volume * 0.55, 'sine')
    playTone(context, frequency * 2.76, now, 0.45, volume * 0.12, 'sine')
  } else if (sound === 'chime') {
    const notes = ascending ? [523.25, 659.25, 783.99] : [783.99, 659.25, 523.25]
    notes.forEach((frequency, index) => playTone(context, frequency, now + index * 0.13, 0.7, volume * 0.3, 'sine'))
  } else if (sound === 'digital') {
    const notes = ascending ? [660, 990] : [990, 660]
    notes.forEach((frequency, index) => playTone(context, frequency, now + index * 0.14, 0.12, volume * 0.18, 'square'))
  } else {
    playTone(context, ascending ? 420 : 320, now, 0.09, volume * 0.65, 'triangle')
    playTone(context, ascending ? 840 : 640, now, 0.045, volume * 0.15, 'sine')
  }
}

// Timer starts queue behind the completion cue; previews and stops replace playback.
// Queue scheduling uses the audio clock, so background-tab timer throttling cannot cut off a cue.
const playSound = (type: 'start' | 'end', volume: number, selection: string, queue = false): Promise<void> => {
  const context = ensureAudioContext()
  if (!context) return Promise.reject(new Error('AudioContext is unavailable'))
  if (!queue) {
    ++playbackVersion
    stopActiveSources()
    playbackEnd = 0
    playbackQueue = Promise.resolve()
  }
  const version = playbackVersion
  const isCurrentPlayback = () => version === playbackVersion && context.state !== 'closed'
  // Resume within the user gesture, before awaiting queued fetch/decode work.
  const resumed = context.state === 'suspended' ? context.resume() : Promise.resolve()
  // Observe failures immediately even if another file is still loading ahead of this cue.
  void resumed.catch(() => {})
  const scheduled = playbackQueue.then(async () => {
    await resumed
    if (!isCurrentPlayback()) return
    const sound = isTimerSoundId(selection) ? selection : 'classic'
    const level = Number.isFinite(volume) ? Math.min(Math.max(volume, 0), 1) : 0.5
    if (sound === 'bell' || sound === 'chime' || sound === 'digital' || sound === 'wood') {
      const at = Math.max(context.currentTime, playbackEnd)
      playSynthesized(context, sound, type, level, at)
      playbackEnd = at + ({ bell: 1.1, chime: 0.96, digital: 0.26, wood: 0.09 }[sound])
      return
    }
    const recording = RECORDED_TIMER_SOUNDS.find(item => item.id === sound)
    const src = recording?.src ?? (type === 'start' ? '/sounds/break-start.mp3' : '/sounds/break-end.mp3')
    let pending = buffers.get(src)
    if (!pending) {
      pending = fetch(src).then(response => {
        if (!response.ok) throw new Error(`Failed to load ${src}`)
        return response.arrayBuffer()
      }).then(data => context.decodeAudioData(data)).catch(error => {
        if (buffers.get(src) === pending) buffers.delete(src)
        throw error
      })
      buffers.set(src, pending)
    }
    const buffer = await pending
    if (!isCurrentPlayback()) return
    const at = Math.max(context.currentTime, playbackEnd)
    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer
    gain.gain.setValueAtTime(level, at)
    source.connect(gain)
    gain.connect(context.destination)
    trackSource(source, gain)
    source.start(at)
    playbackEnd = at + buffer.duration
  })
  // A failed download must not block later cues or a retry.
  playbackQueue = scheduled.catch(() => {})
  return scheduled
}

export const playStartSound = (volume: number, sound = 'classic', queue = false) => playSound('start', volume, sound, queue)
export const playEndSound = (volume: number, sound = 'classic', queue = false) => playSound('end', volume, sound, queue)

export const disposeNotificationSound = async (): Promise<void> => {
  ++playbackVersion
  stopActiveSources()
  buffers.clear()
  playbackEnd = 0
  playbackQueue = Promise.resolve()
  const context = audioContext
  audioContext = null
  if (context && context.state !== 'closed') await context.close()
}
