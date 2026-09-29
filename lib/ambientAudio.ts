import { ambientSounds, type AmbientSoundId } from '@/lib/ambientSounds'

export type AmbientStatus = 'idle' | 'loading' | 'playing' | 'unavailable' | 'blocked'
type Track = {
  generation: number
  desired: boolean
  buffer?: AudioBuffer
  loading?: Promise<AudioBuffer>
  request?: AbortController
  source?: AudioBufferSourceNode
  gain?: GainNode
}

/** Build the seam in decoded PCM, after any codec padding has been introduced.
 * The body starts after the head; its tail blends into that head, ending at the
 * sample immediately before the body starts. No timer or ended event owns looping.
 */
export function prepareAmbientLoop(context: BaseAudioContext, input: AudioBuffer): AudioBuffer {
  const trim = Math.round(input.sampleRate * 0.05)
  const length = input.length - trim * 2
  const overlap = Math.min(Math.round(input.sampleRate * 2), Math.floor(length / 4))
  if (overlap < 2) throw new Error('Ambient recording is too short')
  const output = context.createBuffer(input.numberOfChannels, length - overlap, input.sampleRate)
  const seam = length - 2 * overlap
  for (let channel = 0; channel < input.numberOfChannels; channel++) {
    const source = input.getChannelData(channel).subarray(trim, input.length - trim)
    const target = output.getChannelData(channel)
    target.set(source.subarray(overlap))
    for (let i = 0; i < overlap; i++) {
      const phase = i / (overlap - 1) * Math.PI / 2
      target[seam + i] = source[length - overlap + i] * Math.cos(phase) + source[i] * Math.sin(phase)
    }
  }
  return output
}

export class AmbientAudio {
  private context?: AudioContext
  private tracks = new Map<AmbientSoundId, Track>()
  private disposed = false

  constructor(private notify: (id: AmbientSoundId, status: AmbientStatus) => void,
    private volume: (id: AmbientSoundId) => number) {}

  private getContext() {
    if (!this.context) {
      const context = new AudioContext()
      this.context = context
      context.onstatechange = () => {
        if (this.disposed || context.state === 'running') return
        // OS/browser interruptions leave the saved mix available to resume explicitly.
        for (const [id, track] of this.tracks) {
          if (track.source) this.stop(id)
        }
      }
    }
    return this.context
  }

  private load(id: AmbientSoundId, track: Track, context: AudioContext) {
    if (track.buffer) return Promise.resolve(track.buffer)
    if (track.loading) return track.loading
    const request = new AbortController()
    track.request = request
    const url = ambientSounds.find(sound => sound.id === id)!.src
    track.loading = fetch(url, { signal: request.signal })
      .then(response => {
        if (!response.ok) throw new Error(`Ambient audio: ${response.status}`)
        return response.arrayBuffer()
      })
      .then(bytes => context.decodeAudioData(bytes))
      .then(decoded => {
        if (this.disposed) throw new Error('Disposed')
        const buffer = prepareAmbientLoop(context, decoded)
        track.buffer = buffer
        return buffer
      })
      .finally(() => { track.loading = undefined; track.request = undefined })
    return track.loading
  }

  play(id: AmbientSoundId) {
    if (this.disposed) return
    let track = this.tracks.get(id)
    if (!track) {
      track = { generation: 0, desired: false }
      this.tracks.set(id, track)
    }
    if (track.desired) return
    const entry = track
    const generation = ++entry.generation
    entry.desired = true
    this.notify(id, 'loading')
    try {
      const context = this.getContext()
      // Resume synchronously within the user's click, before fetching/decoding.
      const resumed = context.resume()
      void Promise.all([resumed, this.load(id, entry, context)]).then(([, buffer]) => {
        if (this.disposed || generation !== entry.generation || !entry.desired) return
        if (context.state !== 'running') throw new DOMException('Audio suspended', 'NotAllowedError')
        const source = context.createBufferSource()
        const gain = context.createGain()
        source.buffer = buffer
        source.loop = true
        source.connect(gain)
        gain.connect(context.destination)
        gain.gain.setValueAtTime(0, context.currentTime)
        gain.gain.linearRampToValueAtTime(this.volume(id), context.currentTime + 0.25)
        entry.source = source
        entry.gain = gain
        source.start()
        this.notify(id, 'playing')
      }).catch(error => this.fail(id, entry, generation, error))
    } catch (error) { this.fail(id, entry, generation, error) }
  }

  private fail(id: AmbientSoundId, track: Track, generation: number, error: unknown) {
    if (this.disposed || generation !== track.generation) return
    this.stop(id)
    this.notify(id, error instanceof DOMException && error.name === 'NotAllowedError' ? 'blocked' : 'unavailable')
  }

  stop(id: AmbientSoundId) {
    const track = this.tracks.get(id)
    if (!track) return
    track.desired = false
    track.generation++
    if (track.source) {
      track.source.stop()
      track.source.disconnect()
      track.source = undefined
    }
    track.gain?.disconnect()
    track.gain = undefined
    // Keep the one pending load/cache for rapid off/on toggles; abort on disposal.
    if (!this.disposed) this.notify(id, 'idle')
  }

  updateVolumes() {
    const context = this.context
    if (!context || this.disposed) return
    for (const [id, track] of this.tracks) {
      if (!track.gain) continue
      const gain = track.gain.gain
      gain.cancelScheduledValues(context.currentTime)
      gain.setTargetAtTime(this.volume(id), context.currentTime, 0.025)
    }
  }

  dispose() {
    this.disposed = true
    for (const [id, track] of this.tracks) {
      this.stop(id)
      track.request?.abort()
    }
    this.tracks.clear()
    if (this.context) {
      this.context.onstatechange = null
      void this.context.close().catch(() => {})
    }
  }
}
