let audioContext: AudioContext | null = null
let startBuffer: AudioBuffer | null = null
let endBuffer: AudioBuffer | null = null

type ExtendedWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

const getAudioContextClass = (): typeof AudioContext | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const extendedWindow = window as ExtendedWindow
  return window.AudioContext || extendedWindow.webkitAudioContext || null
}

const ensureAudioContext = (): AudioContext | null => {
  if (audioContext) {
    return audioContext
  }

  const AudioContextClass = getAudioContextClass()

  if (!AudioContextClass) {
    console.warn('AudioContext API is unavailable in this environment')
    return null
  }

  audioContext = new AudioContextClass()
  return audioContext
}

const fetchAudioBuffer = async (src: string): Promise<AudioBuffer | null> => {
  const context = ensureAudioContext()

  if (!context) {
    console.warn('No audio context available')
    return null
  }

  try {
    console.log('Fetching audio:', src)
    const response = await fetch(src)
    
    if (!response.ok) {
      console.error(`Failed to fetch ${src}: ${response.status}`)
      return null
    }
    
    const arrayBuffer = await response.arrayBuffer()
    console.log(`Loaded ${src}, size: ${arrayBuffer.byteLength} bytes`)
    
    const audioBuffer = await context.decodeAudioData(arrayBuffer)
    console.log(`Decoded ${src} successfully`)
    return audioBuffer
  } catch (error) {
    console.error(`Failed to load audio: ${src}`, error)
    return null
  }
}

const playBuffer = (buffer: AudioBuffer, volume: number) => {
  const context = ensureAudioContext()

  if (!context) {
    console.warn('No audio context in playBuffer')
    return
  }

  const source = context.createBufferSource()
  const gain = context.createGain()
  const clampedVolume = Math.min(Math.max(volume, 0), 1)

  source.buffer = buffer
  source.connect(gain)
  gain.connect(context.destination)
  gain.gain.setValueAtTime(clampedVolume, context.currentTime)

  console.log('Playing sound with volume:', clampedVolume, 'duration:', buffer.duration)
  source.start()
  source.onended = () => {
    console.log('Sound playback finished')
    source.disconnect()
    gain.disconnect()
  }
}

export const playStartSound = async (volume: number): Promise<void> => {
  console.log('playStartSound called with volume:', volume)
  const context = ensureAudioContext()

  if (!context) {
    console.warn('No audio context in playStartSound')
    return
  }

  console.log('AudioContext state:', context.state)
  if (context.state === 'suspended') {
    try {
      console.log('Resuming suspended AudioContext')
      await context.resume()
      console.log('AudioContext resumed, new state:', context.state)
    } catch (error) {
      console.error('Failed to resume AudioContext:', error)
      return
    }
  }

  if (!startBuffer) {
    console.log('Loading start sound buffer')
    startBuffer = await fetchAudioBuffer('/sounds/break-start.mp3')
  }

  if (startBuffer) {
    console.log('Playing start sound')
    playBuffer(startBuffer, volume)
  } else {
    console.error('Start buffer is null, cannot play sound')
  }
}

export const playEndSound = async (volume: number): Promise<void> => {
  console.log('playEndSound called with volume:', volume)
  const context = ensureAudioContext()

  if (!context) {
    console.warn('No audio context in playEndSound')
    return
  }

  console.log('AudioContext state:', context.state)
  if (context.state === 'suspended') {
    try {
      console.log('Resuming suspended AudioContext')
      await context.resume()
      console.log('AudioContext resumed, new state:', context.state)
    } catch (error) {
      console.error('Failed to resume AudioContext:', error)
      return
    }
  }

  if (!endBuffer) {
    console.log('Loading end sound buffer')
    endBuffer = await fetchAudioBuffer('/sounds/break-end.mp3')
  }

  if (endBuffer) {
    console.log('Playing end sound')
    playBuffer(endBuffer, volume)
  } else {
    console.error('End buffer is null, cannot play sound')
  }
}

export const disposeNotificationSound = async (): Promise<void> => {
  startBuffer = null
  endBuffer = null

  if (!audioContext) {
    return
  }

  try {
    if (audioContext.state !== 'closed') {
      await audioContext.close()
    }
  } finally {
    audioContext = null
  }
}

