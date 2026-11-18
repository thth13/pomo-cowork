'use client'

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { Loader2, Music2, Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useI18n } from '@/components/I18nProvider'
import { focusPlaylists } from '@/lib/focusMusic'
import styles from './FocusMusicPlayer.module.css'

const playlist = focusPlaylists[0]
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
const VOLUME_KEY = 'pomo:music:volume:v1'

export default function FocusMusicPlayer() {
  const { language } = useI18n()
  const copy = language === 'es'
    ? { play: 'Reproducir', pause: 'Pausar', previous: 'Anterior', next: 'Siguiente', seek: 'Posición', volume: 'Volumen', loading: 'Cargando música', error: 'No se pudo reproducir la pista. Inténtalo de nuevo.', retry: 'Reintentar', credits: 'Créditos musicales', tracks: 'Pistas' }
    : { play: 'Play', pause: 'Pause', previous: 'Previous track', next: 'Next track', seek: 'Playback position', volume: 'Volume', loading: 'Loading music', error: 'Could not play this track. Please try again.', retry: 'Retry', credits: 'Music credits', tracks: 'Tracks' }
  const volumeId = useId()
  const volumeRef = useRef<HTMLDivElement>(null)
  const volumeSliderRef = useRef<HTMLInputElement>(null)
  const volumeTriggerRef = useRef<HTMLButtonElement>(null)
  const [volumeOpen, setVolumeOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const wantsPlayback = useRef(false)
  const attemptRef = useRef(0)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState<number>(playlist.tracks[0].duration)
  const [volume, setVolume] = useState(60)
  const track = playlist.tracks[index]

  useEffect(() => {
    if (!volumeOpen) return
    volumeSliderRef.current?.focus({ preventScroll: true })
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !volumeRef.current?.contains(event.target)) setVolumeOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [volumeOpen])

  const play = async () => {
    const audio = audioRef.current
    if (!audio) return
    const attempt = ++attemptRef.current
    wantsPlayback.current = true
    setError(false)
    setLoading(true)
    try {
      await audio.play()
      if (attempt === attemptRef.current) setLoading(false)
    } catch {
      if (attempt !== attemptRef.current) return
      wantsPlayback.current = false
      setError(true)
      setLoading(false)
      setPlaying(false)
    }
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VOLUME_KEY)
      const value = saved === null ? 60 : Number(saved)
      if (Number.isFinite(value) && value >= 0 && value <= 100) setVolume(value)
    } catch { /* Default volume stays available without storage. */ }
    const audio = audioRef.current
    return () => {
      ++attemptRef.current
      audio?.pause()
      audio?.removeAttribute('src')
      audio?.load()
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100
  }, [volume])

  useEffect(() => {
    ++attemptRef.current
    setPosition(0)
    setDuration(track.duration)
    setError(false)
    setPlaying(false)
    if (audioRef.current) {
      audioRef.current.src = track.src
      audioRef.current.load()
    }
    if (wantsPlayback.current) void play()
    // Track changes preserve playback intent; opening the player never autoplays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  const selectTrack = (next: number) => {
    wantsPlayback.current = true
    if (next === index) {
      if (error) audioRef.current?.load()
      void play()
    } else {
      ++attemptRef.current
      setIndex(next)
    }
  }

  const toggle = () => {
    if (wantsPlayback.current || playing) {
      wantsPlayback.current = false
      ++attemptRef.current
      audioRef.current?.pause()
      setLoading(false)
      setPlaying(false)
    } else {
      if (error) audioRef.current?.load()
      void play()
    }
  }

  return (
    <div className={styles.player} data-no-translate>
      <audio
        ref={audioRef}
        src={track.src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => { if (wantsPlayback.current) setLoading(true) }}
        onPlaying={() => { setPlaying(true); setLoading(false) }}
        onTimeUpdate={event => setPosition(event.currentTarget.currentTime)}
        onLoadedMetadata={event => {
          const value = event.currentTarget.duration
          if (Number.isFinite(value) && value > 0) setDuration(value)
        }}
        onError={() => {
          ++attemptRef.current
          wantsPlayback.current = false
          setError(true)
          setPlaying(false)
          setLoading(false)
        }}
        onEnded={() => selectTrack((index + 1) % playlist.tracks.length)}
      />
      <div className={styles.heading}>
        <div className={styles.artwork} aria-hidden="true">
          <Image src="/audio/deep-focus/cover.svg" alt="" width={72} height={72} />
        </div>
        <div className={styles.content}>
          <h2>{playlist.title}</h2>
          <p className={styles.nowPlaying} aria-live="polite" title={`${track.title} · ${track.artist}`}>{track.title}</p>
          <div className={styles.controls}>
            <button type="button" onClick={() => selectTrack((index - 1 + playlist.tracks.length) % playlist.tracks.length)} aria-label={copy.previous} title={copy.previous}><SkipBack size={16} /></button>
            <button type="button" className={styles.play} onClick={toggle} aria-label={playing || loading ? copy.pause : copy.play} title={playing || loading ? copy.pause : copy.play}>
              {loading ? <Loader2 className={styles.spinner} size={18} aria-hidden="true" /> : playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
            </button>
            <button type="button" onClick={() => selectTrack((index + 1) % playlist.tracks.length)} aria-label={copy.next} title={copy.next}><SkipForward size={16} /></button>
            <div ref={volumeRef} className={styles.volumeControl}
              onBlur={event => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setVolumeOpen(false)
              }}
              onKeyDown={event => {
                if (event.key === 'Escape' && volumeOpen) {
                  event.preventDefault()
                  event.stopPropagation()
                  setVolumeOpen(false)
                  volumeTriggerRef.current?.focus()
                }
              }}>
              <button ref={volumeTriggerRef} type="button" aria-label={copy.volume} title={copy.volume}
                aria-expanded={volumeOpen} aria-controls={volumeOpen ? volumeId : undefined}
                onClick={() => setVolumeOpen(current => !current)}><Volume2 size={16} aria-hidden="true" /></button>
              {volumeOpen && <div id={volumeId} className={styles.volumePopup} role="group" aria-label={copy.volume}>
                <input ref={volumeSliderRef} type="range" min={0} max={100} value={volume} aria-label={copy.volume} aria-valuetext={`${volume}%`} onChange={event => {
                  const value = Number(event.target.value)
                  setVolume(value)
                  try { localStorage.setItem(VOLUME_KEY, String(value)) } catch { /* Keep volume in memory. */ }
                }} />
                <span aria-hidden="true">{volume}%</span>
              </div>}
            </div>
          </div>
        </div>
      </div>
      <input className={styles.seek} type="range" min={0} max={duration} step={1} value={Math.min(position, duration)}
        style={{ '--progress': `${duration > 0 ? Math.min(position / duration, 1) * 100 : 0}%` } as CSSProperties}
        aria-label={copy.seek} aria-valuetext={`${formatTime(position)} / ${formatTime(duration)}`}
        onChange={event => {
          const audio = audioRef.current
          if (!audio || audio.readyState < 1) return
          const value = Number(event.target.value)
          audio.currentTime = value
          setPosition(value)
        }} />
      {loading && <span className="sr-only" role="status">{copy.loading}</span>}
      {error && <div className={styles.error} role="alert"><span>{copy.error}</span><button type="button" onClick={() => { audioRef.current?.load(); void play() }}>{copy.retry}</button></div>}
      <ol className={styles.tracks} aria-label={copy.tracks}>
        {playlist.tracks.map((item, trackIndex) => <li key={item.id}>
          <button type="button" aria-current={index === trackIndex ? 'true' : undefined} onClick={() => selectTrack(trackIndex)} aria-label={`${copy.play}: ${item.title}`}>
            <span className={styles.number} aria-hidden="true">{index === trackIndex && playing ? <Music2 size={14} /> : String(trackIndex + 1).padStart(2, '0')}</span>
            <span className={styles.trackTitle}>{item.title}</span>
            <span className={styles.trackTime}>{formatTime(item.duration)}</span>
          </button>
        </li>)}
      </ol>
      <div className={styles.credits}>
        <Link href="/terms#music-credits" prefetch={false}>{copy.credits}</Link>
      </div>
    </div>
  )
}
