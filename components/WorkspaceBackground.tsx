'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BACKGROUNDS, PLAY_BACKGROUND_EVENT } from '@/lib/appearance'
import { useAppearanceStore } from '@/store/useAppearanceStore'
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference'
import { useSceneryContrast } from '@/hooks/useSceneryContrast'

type Scene = Exclude<(typeof BACKGROUNDS)[number], { kind: 'default' }>

function BackgroundMedia({ scene }: { scene: Scene }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  useSceneryContrast(imageRef, scene.id)
  const videoPaused = useAppearanceStore(state => state.videoPaused)
  const setVideoPaused = useAppearanceStore(state => state.setVideoPaused)
  const setMediaStatus = useAppearanceStore(state => state.setMediaStatus)
  const reducedMotion = useReducedMotionPreference()
  const [visible, setVisible] = useState(false)
  const [failed, setFailed] = useState(false)
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
    const video = videoRef.current
    if (!video) return
    // Call play directly during the gesture for browsers that block autoplay.
    video.play().catch(() => {
      if (!video.isConnected) return
      setMediaStatus(scene.id, 'blocked')
    })
  }, [reducedMotion, failed, setVideoPaused, setMediaStatus, scene.id])

  useEffect(() => {
    // A synchronous event preserves the user gesture from the settings dialog.
    window.addEventListener(PLAY_BACKGROUND_EVENT, retryPlayback)
    return () => window.removeEventListener(PLAY_BACKGROUND_EVENT, retryPlayback)
  }, [retryPlayback])

  return (
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
            setMediaStatus(scene.id, 'ready')
          }}
          onError={() => {
            setFailed(true)
            setMediaStatus(scene.id, 'error')
          }}
        />
      )}
      <div className="workspace-background-wash" />
    </div>
  )
}

export default function WorkspaceBackground() {
  const backgroundId = useAppearanceStore(state => state.backgroundId)
  const revision = useAppearanceStore(state => state.mediaRevision)
  const scene = BACKGROUNDS.find(background => background.id === backgroundId)
  if (!scene || scene.kind === 'default') return null
  return <BackgroundMedia key={`${scene.id}:${revision}`} scene={scene} />
}
