'use client'

import { useEffect, useRef, useState } from 'react'
import { ambientSounds, ambientVolume, defaultAmbientPreferences, type AmbientPreferences, type AmbientSoundId } from '@/lib/ambientSounds'

type Status = 'idle' | 'loading' | 'playing' | 'unavailable' | 'blocked'
type Track = { audio: HTMLAudioElement; generation: number; desired: boolean; fade?: ReturnType<typeof setInterval> }
const STORAGE_KEY = 'pomo:ambient:v1'

// One owner in HomeWorkspace, independent of window visibility and timer state.
export function useAmbientSounds() {
  const [preferences, setPreferences] = useState(defaultAmbientPreferences)
  const prefs = useRef(preferences)
  const tracks = useRef(new Map<AmbientSoundId, Track>())
  const [statuses, setStatuses] = useState<Partial<Record<AmbientSoundId, Status>>>({})
  const [ready, setReady] = useState(false)
  const alive = useRef(false)

  useEffect(() => {
    alive.current = true
    const restored = defaultAmbientPreferences()
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
      restored.master = ambientVolume(saved?.master, restored.master)
      for (const { id } of ambientSounds) {
        restored.tracks[id] = {
          enabled: saved?.tracks?.[id]?.enabled === true,
          volume: ambientVolume(saved?.tracks?.[id]?.volume, restored.tracks[id].volume),
        }
      }
    } catch { /* Invalid or unavailable storage uses defaults. */ }
    prefs.current = restored
    setPreferences(restored)
    setReady(true)
    const ownedTracks = tracks.current
    return () => {
      alive.current = false
      for (const track of ownedTracks.values()) {
        track.generation++
        track.desired = false
        clearInterval(track.fade)
        track.audio.onplaying = null
        track.audio.onwaiting = null
        track.audio.onerror = null
        track.audio.onpause = null
        track.audio.pause()
        track.audio.removeAttribute('src')
        track.audio.load()
      }
      ownedTracks.clear()
    }
  }, [])

  const updateStatus = (id: AmbientSoundId, status: Status) => {
    if (alive.current) setStatuses(current => ({ ...current, [id]: status }))
  }
  const save = (next: AmbientPreferences) => {
    prefs.current = next
    setPreferences(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* Keep in memory. */ }
  }
  const effectiveVolume = (id: AmbientSoundId) => prefs.current.master * prefs.current.tracks[id].volume / 10000
  const stopTrack = (id: AmbientSoundId) => {
    const track = tracks.current.get(id)
    if (track) {
      track.desired = false
      track.generation++
      clearInterval(track.fade)
      track.audio.pause()
      track.audio.volume = 0
    }
    updateStatus(id, 'idle')
  }
  const playTrack = (id: AmbientSoundId) => {
    let track = tracks.current.get(id)
    if (!track) {
      const audio = new Audio()
      audio.preload = 'none'
      audio.loop = true
      audio.src = ambientSounds.find(sound => sound.id === id)!.src
      track = { audio, generation: 0, desired: false }
      tracks.current.set(id, track)
      const entry = track
      audio.onplaying = () => {
        if (!entry.desired) { audio.pause(); return }
        updateStatus(id, 'playing')
      }
      audio.onwaiting = () => { if (entry.desired) updateStatus(id, 'loading') }
      audio.onpause = () => {
        // A browser/OS interruption is resumable without changing the saved mix.
        if (entry.desired && audio.paused) {
          entry.desired = false
          entry.generation++
          clearInterval(entry.fade)
          updateStatus(id, 'idle')
        }
      }
      audio.onerror = () => {
        if (!entry.desired) return
        entry.desired = false
        entry.generation++
        clearInterval(entry.fade)
        audio.pause()
        updateStatus(id, 'unavailable')
      }
    }
    const entry = track
    const generation = ++entry.generation
    entry.desired = true
    clearInterval(entry.fade)
    entry.audio.volume = 0
    // Reload only a failed source; ordinary toggles reuse the same element and position.
    if (entry.audio.error) entry.audio.load()
    updateStatus(id, 'loading')
    void entry.audio.play().then(() => {
      if (!alive.current || generation !== entry.generation || !entry.desired) return
      updateStatus(id, 'playing')
      const started = performance.now()
      entry.fade = setInterval(() => {
        const progress = Math.min(1, (performance.now() - started) / 250)
        entry.audio.volume = effectiveVolume(id) * progress
        if (progress === 1) clearInterval(entry.fade)
      }, 25)
    }).catch((error: unknown) => {
      if (!alive.current || generation !== entry.generation || !entry.desired) return
      entry.desired = false
      clearInterval(entry.fade)
      entry.audio.pause()
      updateStatus(id, error instanceof DOMException && error.name === 'NotAllowedError' ? 'blocked' : 'unavailable')
    })
  }
  const toggle = (id: AmbientSoundId) => {
    const enabled = !prefs.current.tracks[id].enabled
    save({ ...prefs.current, tracks: { ...prefs.current.tracks, [id]: { ...prefs.current.tracks[id], enabled } } })
    if (enabled) playTrack(id)
    else stopTrack(id)
  }
  const setVolume = (id: AmbientSoundId, value: number) => {
    save({ ...prefs.current, tracks: { ...prefs.current.tracks, [id]: { ...prefs.current.tracks[id], volume: ambientVolume(value, 50) } } })
    const track = tracks.current.get(id)
    if (track?.desired) { clearInterval(track.fade); track.audio.volume = effectiveVolume(id) }
  }
  const setMaster = (value: number) => {
    save({ ...prefs.current, master: ambientVolume(value, 70) })
    for (const [id, track] of tracks.current) {
      if (track.desired) { clearInterval(track.fade); track.audio.volume = effectiveVolume(id) }
    }
  }
  const stopAll = () => {
    const next = { ...prefs.current, tracks: { ...prefs.current.tracks } }
    for (const { id } of ambientSounds) {
      next.tracks[id] = { ...next.tracks[id], enabled: false }
      stopTrack(id)
    }
    save(next)
  }
  const resume = () => {
    for (const { id } of ambientSounds) {
      if (prefs.current.tracks[id].enabled && !tracks.current.get(id)?.desired) playTrack(id)
    }
  }
  const activeCount = Object.values(statuses).filter(status => status === 'playing').length
  const hasEnabled = ambientSounds.some(({ id }) => preferences.tracks[id].enabled)
  const hasSavedMix = ambientSounds.some(({ id }) => preferences.tracks[id].enabled && (!statuses[id] || statuses[id] === 'idle'))
  return { preferences, statuses, ready, toggle, setVolume, setMaster, stopAll, resume, retry: playTrack, activeCount, hasEnabled, hasSavedMix }
}

export type AmbientMixer = ReturnType<typeof useAmbientSounds>
