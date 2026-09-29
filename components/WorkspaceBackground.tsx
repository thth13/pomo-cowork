'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { BACKGROUNDS, PLAY_BACKGROUND_EVENT } from '@/lib/appearance'
import { appearanceCopy } from '@/lib/i18n/appearance'
import { useI18n } from '@/components/I18nProvider'
import { useAppearanceStore } from '@/store/useAppearanceStore'
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference'
import { useSceneryContrast } from '@/hooks/useSceneryContrast'

type Scene = Exclude<(typeof BACKGROUNDS)[number], { kind: 'default' }>

function BackgroundMedia({ scene }: { scene: Scene }) {
  const { language } = useI18n()
  const copy = appearanceCopy[language]
  const videoRef = useRef<HTMLVideoElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  useSceneryContrast(imageRef, scene.id)
  const videoPaused = useAppearanceStore(state => state.videoPaused)
  const setVideoPaused = useAppearanceStore(state => state.setVideoPaused)
  const setMediaStatus = useAppearanceStore(state => state.setMediaStatus)
  const reducedMotion = useReducedMotionPreference()
  const [visible, setVisible] = useState(false)
  const [failed, setFailed] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [posterFailed, setPosterFailed] = useState(false)
  const shouldPlay = scene.kind === 'video' && !videoPaused && !reducedMotion && visible && !failed

  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible')
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  useEffect(() => {
    if (failed || (scene.kind === 'image' && posterFailed)) return
    if (scene.kind === 'video' && !shouldPlay) {
      setMediaStatus(scene.id, posterFailed ? 'error' : 'ready')
      return
    }
    if (scene.kind === 'image' && imageRef.current?.complete && imageRef.current.naturalWidth > 0) {
      setMediaStatus(scene.id, 'ready')
      return
    }
    if (scene.kind === 'video' && videoRef.current && !videoRef.current.paused && videoRef.current.readyState >= 3) {
      setMediaStatus(scene.id, 'ready')
      return
    }
    setMediaStatus(scene.id, 'loading')
    const timeout = window.setTimeout(() => {
      if (useAppearanceStore.getState().mediaStatus !== 'loading') return
      if (scene.kind === 'video') setFailed(true)
      setMediaStatus(scene.id, 'error')
    }, 20000)
    return () => window.clearTimeout(timeout)
  }, [scene.id, scene.kind, shouldPlay, failed, posterFailed, setMediaStatus])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let cancelled = false
    if (shouldPlay) {
      video.play().catch(error => {
        if (cancelled || error?.name === 'AbortError') return
        setBlocked(true)
        setMediaStatus(scene.id, 'blocked')
      })
    } else {
      video.pause()
    }
    return () => {
      cancelled = true
      video.pause()
    }
  }, [shouldPlay, scene.id, setMediaStatus])

  const retryPlayback = useCallback(() => {
    if (reducedMotion || failed) return
    setVideoPaused(false)
    setBlocked(false)
    const video = videoRef.current
    if (!video) return
    // Call play directly during the gesture for browsers that block autoplay.
    video.play().catch(() => {
      if (!video.isConnected) return
      setBlocked(true)
      setMediaStatus(scene.id, 'blocked')
    })
  }, [reducedMotion, failed, setVideoPaused, setMediaStatus, scene.id])

  useEffect(() => {
    // A synchronous event preserves the user gesture from the settings dialog.
    window.addEventListener(PLAY_BACKGROUND_EVENT, retryPlayback)
    return () => window.removeEventListener(PLAY_BACKGROUND_EVENT, retryPlayback)
  }, [retryPlayback])

  return (
    <>
      <div className="workspace-background" aria-hidden="true">
        {!posterFailed && (
          // Optimized Blob assets; CORS allows contrast sampling through canvas.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imageRef}
            crossOrigin="anonymous"
            src={scene.kind === 'video' ? scene.preview : scene.src}
            alt=""
            className="workspace-background-media"
            onLoad={() => { if (scene.kind === 'image') setMediaStatus(scene.id, 'ready') }}
            onError={() => {
              setPosterFailed(true)
              if (scene.kind === 'image' || !shouldPlay) setMediaStatus(scene.id, 'error')
            }}
          />
        )}
        {scene.kind === 'video' && !failed && !reducedMotion && (
          <video
            ref={videoRef}
            src={scene.src}
            poster={posterFailed ? undefined : scene.preview}
            className="workspace-background-media"
            muted
            loop
            playsInline
            preload={shouldPlay ? 'auto' : 'none'}
            tabIndex={-1}
            disablePictureInPicture
            disableRemotePlayback
            onPlaying={() => {
              setPlaying(true)
              setBlocked(false)
              setMediaStatus(scene.id, 'ready')
            }}
            onPause={() => setPlaying(false)}
            onError={() => {
              setFailed(true)
              setPlaying(false)
              setMediaStatus(scene.id, 'error')
            }}
          />
        )}
        <div className="workspace-background-wash" />
      </div>
      {scene.kind === 'video' && !reducedMotion && !failed && (
        <button
          type="button"
          className="background-playback"
          onClick={playing && !blocked ? () => setVideoPaused(true) : retryPlayback}
          aria-label={playing && !blocked ? copy.pause : copy.play}
          title={playing && !blocked ? copy.pause : copy.play}
          data-no-translate
        >
          {playing && !blocked ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
          <span>{playing && !blocked ? copy.pause : copy.play}</span>
        </button>
      )}
    </>
  )
}

export default function WorkspaceBackground() {
  const backgroundId = useAppearanceStore(state => state.backgroundId)
  const revision = useAppearanceStore(state => state.mediaRevision)
  const scene = BACKGROUNDS.find(background => background.id === backgroundId)
  if (!scene || scene.kind === 'default') return null
  return <BackgroundMedia key={`${scene.id}:${revision}`} scene={scene} />
}
