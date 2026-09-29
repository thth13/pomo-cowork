'use client'

import { useEffect, useRef, useState } from 'react'
import { ambientSounds, ambientVolume, defaultAmbientPreferences, type AmbientPreferences, type AmbientSoundId } from '@/lib/ambientSounds'

import { AmbientAudio, type AmbientStatus } from '@/lib/ambientAudio'
const STORAGE_KEY = 'pomo:ambient:v1'

// One owner in HomeWorkspace, independent of window visibility and timer state.
export function useAmbientSounds() {
  const [preferences, setPreferences] = useState(defaultAmbientPreferences)
  const prefs = useRef(preferences)
  const engine = useRef<AmbientAudio | null>(null)
  const [statuses, setStatuses] = useState<Partial<Record<AmbientSoundId, AmbientStatus>>>({})
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
    const audio = new AmbientAudio(
      (id, status) => { if (alive.current) setStatuses(current => ({ ...current, [id]: status })) },
      id => prefs.current.master * prefs.current.tracks[id].volume / 10000,
    )
    engine.current = audio
    return () => {
      alive.current = false
      audio.dispose()
      engine.current = null
    }
  }, [])

  const save = (next: AmbientPreferences) => {
    prefs.current = next
    setPreferences(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* Keep in memory. */ }
  }
  const stopTrack = (id: AmbientSoundId) => engine.current?.stop(id)
  const playTrack = (id: AmbientSoundId) => engine.current?.play(id)
  const toggle = (id: AmbientSoundId) => {
    const enabled = !prefs.current.tracks[id].enabled
    save({ ...prefs.current, tracks: { ...prefs.current.tracks, [id]: { ...prefs.current.tracks[id], enabled } } })
    if (enabled) playTrack(id)
    else stopTrack(id)
  }
  const setVolume = (id: AmbientSoundId, value: number) => {
    save({ ...prefs.current, tracks: { ...prefs.current.tracks, [id]: { ...prefs.current.tracks[id], volume: ambientVolume(value, 50) } } })
    engine.current?.updateVolumes()
  }
  const setMaster = (value: number) => {
    save({ ...prefs.current, master: ambientVolume(value, 70) })
    engine.current?.updateVolumes()
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
      if (prefs.current.tracks[id].enabled) playTrack(id)
    }
  }
  const activeCount = Object.values(statuses).filter(status => status === 'playing').length
  const hasEnabled = ambientSounds.some(({ id }) => preferences.tracks[id].enabled)
  const hasSavedMix = ambientSounds.some(({ id }) => preferences.tracks[id].enabled && (!statuses[id] || statuses[id] === 'idle'))
  return { preferences, statuses, ready, toggle, setVolume, setMaster, stopAll, resume, retry: playTrack, activeCount, hasEnabled, hasSavedMix }
}

export type AmbientMixer = ReturnType<typeof useAmbientSounds>
