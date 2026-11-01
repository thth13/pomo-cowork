'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { logBeepEvent } from '@/lib/beepEvents'
import { usePathname } from 'next/navigation'
import type { KeyboardEvent } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { EyeOff } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { useTimerStore } from '@/store/useTimerStore'
import { COMPANION_STORAGE_KEY, useCompanionStore } from '@/store/useCompanionStore'
import { SessionType } from '@/types'
import type { CompanionMood, CompanionPose } from './companionTypes'
import styles from './WalkingCompanion.module.css'
import TomGuide from './TomGuide'
import type { GuideTarget } from './useBeepTour'
import { BEEP_CELEBRATION_DURATION } from './BeepReactions'

const DRAG_THRESHOLD_PX = 4
const WALK_SPEED_PX_PER_SECOND = 125
const WANDER_RADIUS_X = 320
const WANDER_RADIUS_Y = 140
type CompanionDrag = { id: number; offsetX: number; offsetY: number; lastX: number; lastTime: number; start: { x: number; y: number } }
const copy = {
  en: { animations: 'Animate companion', hide: 'Hide companion', roam: 'Let Mr. Beep wander' },
  es: { animations: 'Animar al compañero', hide: 'Ocultar compañero', roam: 'Dejar que Mr. Beep pasee' },
}

export default function WalkingCompanion() {
  const pathname = usePathname()
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(min-width: 720px)')
    const update = () => setDesktop(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/')
  return desktop && !isAdmin ? <DesktopCompanion /> : null
}

function DesktopCompanion() {
  const { language } = useI18n()
  const text = copy[language]
  const running = useTimerStore(state => state.isRunning)
  const sessionType = useTimerStore(state => state.currentSession?.type)
  const mood: CompanionMood = !running ? 'idle' : sessionType === SessionType.SHORT_BREAK || sessionType === SessionType.LONG_BREAK ? 'break' : 'focus'
  const visible = useCompanionStore(state => state.visible)
  const setVisible = useCompanionStore(state => state.setVisible)
  const [wandering, setWandering] = useState(true)
  const [animations, setAnimations] = useState(true)
  const animationsRef = useRef(animations)
  animationsRef.current = animations
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [hydrated, setHydrated] = useState(false)
  const artworkRef = useRef<HTMLDivElement>(null)
  const actorRef = useRef<HTMLDivElement>(null)
  const gripRef = useRef<HTMLButtonElement>(null)
  const interacting = useRef(false)
  const target = useRef({ x: 0.2, y: 0.8 })
  const position = useRef({ x: 0.2, y: 0.8 })
  const home = useRef({ x: 0.2, y: 0.8 })
  const press = useRef<{ x: number; y: number; grip: CompanionDrag } | null>(null)
  const suppressClick = useRef(false)
  const drag = useRef<CompanionDrag | null>(null)
  const [held, setHeld] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [guideSpeaking, setGuideSpeaking] = useState(false)
  const [guideRequest, setGuideRequest] = useState(0)
  const guideTarget = useRef<GuideTarget>(null)
  const followGuide = useCallback((next: GuideTarget) => {
    guideTarget.current = next
    if (next) {
      target.current = {
        x: Math.max(0, Math.min(1, next.x / Math.max(1, window.innerWidth - 144))),
        y: Math.max(0, Math.min(1, (next.y - 8) / Math.max(1, window.innerHeight - 230))),
      }
    } else target.current = { ...home.current }
  }, [])
  const pose = useRef<CompanionPose>({ mood, walking: false, direction: 1, reducedMotion: false })
  pose.current.mood = mood
  pose.current.speaking = guideSpeaking
  const roaming = useRef(wandering)
  roaming.current = wandering && !guideOpen

  useEffect(() => {
    if (!visible) {
      setGuideRequest(0)
      interacting.current = false
      pose.current.hovered = false
    }
  }, [visible])

  useEffect(() => useTimerStore.subscribe((state, previous) => {
    if (state.completionSequence !== previous.completionSequence && !document.hidden) {
      target.current = { ...position.current }
      pose.current.celebrateUntil = performance.now() / 1000 + BEEP_CELEBRATION_DURATION
    }
  }), [])

  useEffect(() => {
    if (guideOpen) target.current = { ...position.current }
  }, [guideOpen])

  const save = useCallback((nextVisible = visible, nextWandering = wandering, nextAnimations = animations) => {
    try { localStorage.setItem(COMPANION_STORAGE_KEY, JSON.stringify({ visible: nextVisible, wandering: nextWandering, animations: nextAnimations, ...home.current })) } catch { /* Optional preference; keep the in-memory companion usable. */ }
  }, [visible, wandering, animations])

  function cancelPress() {
    const pending = press.current
    if (!pending) return
    press.current = null
    suppressClick.current = true
    if (gripRef.current?.hasPointerCapture(pending.grip.id)) gripRef.current.releasePointerCapture(pending.grip.id)
  }

  function drop(cancel = false) {
    if (!drag.current) return
    const pointerId = drag.current.id
    if (cancel) position.current = { ...drag.current.start }
    target.current = { ...position.current }
    if (!cancel) home.current = { ...position.current }
    drag.current = null
    if (gripRef.current?.hasPointerCapture(pointerId)) gripRef.current.releasePointerCapture(pointerId)
    pose.current.held = false
    pose.current.dragVelocity = 0
    setHeld(false)
    save()
  }

  function pickUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || status !== 'ready' || guideTarget.current || document.querySelector('[aria-modal="true"]')) return
    cancelPress()
    suppressClick.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = actorRef.current!.getBoundingClientRect()
    const initial = { id: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, lastX: event.clientX, lastTime: event.timeStamp, start: { ...position.current } }
    target.current = { ...position.current }
    press.current = { x: event.clientX, y: event.clientY, grip: initial }
  }

  function releasePointer(event: ReactPointerEvent<HTMLButtonElement>, cancel = false) {
    if (drag.current?.id === event.pointerId) { drop(cancel); return }
    if (press.current?.grip.id !== event.pointerId) return
    if (cancel) { cancelPress(); return }
    press.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function carry(event: ReactPointerEvent<HTMLButtonElement>) {
    const pending = press.current
    if (pending?.grip.id === event.pointerId) {
      if (Math.hypot(event.clientX - pending.x, event.clientY - pending.y) < DRAG_THRESHOLD_PX) return
      press.current = null
      suppressClick.current = true
      drag.current = pending.grip
      pose.current.held = true
      pose.current.celebrateUntil = 0
      pose.current.dragVelocity = 0
      setHeld(true)
    }
    const grip = drag.current
    if (!grip || grip.id !== event.pointerId) return
    const elapsed = Math.max(8, event.timeStamp - grip.lastTime)
    pose.current.dragVelocity = Math.max(-1800, Math.min(1800, (event.clientX - grip.lastX) / elapsed * 1000))
    grip.lastX = event.clientX
    grip.lastTime = event.timeStamp
    position.current = {
      x: Math.max(0, Math.min(1, (event.clientX - grip.offsetX) / Math.max(1, window.innerWidth - 144))),
      y: Math.max(0, Math.min(1, (event.clientY - grip.offsetY - 8) / Math.max(1, window.innerHeight - 230))),
    }
    target.current = { ...position.current }
  }

  useEffect(() => {
    const cancel = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') { cancelPress(); drop(true) } }
    const release = () => { cancelPress(); drop() }
    const onVisibility = () => { if (document.hidden) release() }
    window.addEventListener('blur', release)
    document.addEventListener('keydown', cancel)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('blur', release)
      document.removeEventListener('keydown', cancel)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  })

  useEffect(() => {
    useCompanionStore.getState().hydrate()
    try {
      const saved = JSON.parse(localStorage.getItem(COMPANION_STORAGE_KEY) || 'null')
      if (saved && typeof saved.wandering === 'boolean') setWandering(saved.wandering)
      if (saved && typeof saved.animations === 'boolean') setAnimations(saved.animations)
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        target.current = { x: Math.max(0, Math.min(1, saved.x)), y: Math.max(0, Math.min(1, saved.y)) }
        position.current = { ...target.current }
        home.current = { ...target.current }
      }
    } catch { /* Ignore unavailable storage or invalid optional preferences. */ }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || !visible || !artworkRef.current) return
    const scenePose = pose.current
    let disposed = false
    let frame = 0
    let scene: Awaited<ReturnType<typeof import('./LottieCompanionScene')['createCompanionScene']>> | undefined
    let lastFrame = 0
    let lastStaticPose = ''
    let nextWalk = performance.now() + 12000
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => { pose.current.reducedMotion = media.matches }
    updateMotion()
    media.addEventListener('change', updateMotion)
    const artwork = artworkRef.current
    setStatus('loading')
    import('./LottieCompanionScene').then(async ({ createCompanionScene }) => {
      if (disposed) return
      try {
        scene = await createCompanionScene(artwork)
        if (disposed) { scene.dispose(); return }
        setStatus('ready')
        const animate = (now: number) => {
          if (disposed) return
          frame = requestAnimationFrame(animate)
          if (document.hidden || now - lastFrame < 33) return
          const dt = Math.min((now - (lastFrame || now)) / 1000, 0.05)
          lastFrame = now
          const width = Math.max(1, window.innerWidth - 144)
          const height = Math.max(1, window.innerHeight - 230)
          const state = pose.current
          state.reducedMotion = media.matches || !animationsRef.current
          if (now > nextWalk) {
            nextWalk = now + 14000 + Math.random() * 10000
            if (roaming.current && !interacting.current && !press.current && !state.held && state.mood === 'idle' && now / 1000 >= (state.celebrateUntil || 0) && !state.reducedMotion) {
              const angle = Math.random() * Math.PI * 2
              const radius = Math.sqrt(Math.random())
              target.current = {
                x: Math.max(0, Math.min(1, home.current.x + Math.cos(angle) * radius * WANDER_RADIUS_X / width)),
                y: Math.max(0, Math.min(1, home.current.y + Math.sin(angle) * radius * WANDER_RADIUS_Y / height)),
              }
            }
          }
          const dx = (target.current.x - position.current.x) * width
          const dy = (target.current.y - position.current.y) * height
          const distance = Math.hypot(dx, dy)
          const destination = guideTarget.current
          state.walking = distance > 1 && !destination && !state.reducedMotion && !state.held
          if (Math.abs(dx) > 1) state.direction = Math.sign(dx)
          const step = state.held ? 0 : destination || state.reducedMotion ? 1 : scene?.canMove() ? Math.min(1, dt * WALK_SPEED_PX_PER_SECOND / Math.max(distance, 1)) : 0
          position.current.x += (target.current.x - position.current.x) * step
          position.current.y += (target.current.y - position.current.y) * step
          if (actorRef.current) actorRef.current.style.transform = `translate3d(${position.current.x * width}px, ${8 + position.current.y * height}px, 0)`
          state.pointAt = destination && distance * (1 - step) < 8 ? {
            x: destination.pointX - position.current.x * width,
            y: destination.pointY - (8 + position.current.y * height),
          } : undefined
          const rendered = destination ? { ...state, mood: 'idle' as const, hovered: false, celebrateUntil: 0 } : state
          const signature = `${rendered.mood}:${rendered.direction}:${rendered.reducedMotion}:${rendered.held}:${rendered.hovered}:${rendered.speaking}:${rendered.pointAt?.x}:${rendered.pointAt?.y}:${now / 1000 < (rendered.celebrateUntil || 0)}`
          if (!rendered.reducedMotion || signature !== lastStaticPose) scene?.render(now / 1000, rendered)
          lastStaticPose = signature
          state.dragVelocity = (state.dragVelocity || 0) * Math.exp(-dt * 8)
        }
        frame = requestAnimationFrame(animate)
      } catch {
        scene?.dispose()
        scene = undefined
        if (!disposed) setStatus('error')
      }
    }).catch(() => { if (!disposed) setStatus('error') })
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      media.removeEventListener('change', updateMotion)
      scene?.dispose()
      cancelPress()
      drag.current = null
      scenePose.held = false
      scenePose.hovered = false
    }
  }, [hydrated, visible])

  function nudge(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const delta = event.shiftKey ? 0.2 : 0.06
    target.current = {
      x: Math.max(0, Math.min(1, target.current.x + (event.key === 'ArrowLeft' ? -delta : event.key === 'ArrowRight' ? delta : 0))),
      y: Math.max(0, Math.min(1, target.current.y + (event.key === 'ArrowUp' ? -delta : event.key === 'ArrowDown' ? delta : 0))),
    }
    home.current = { ...target.current }
    save()
  }

  function toggleWandering() {
    if (wandering) {
      target.current = { ...position.current }
    }
    setWandering(!wandering)
    save(visible, !wandering)
  }

  function interactWithActor(active: boolean) {
    interacting.current = active
    pose.current.hovered = active
    if (active && !guideTarget.current && !drag.current) target.current = { ...position.current }
  }

  function openChat() {
    cancelPress()
    drop()
    target.current = { ...position.current }
    const tourStep = document.querySelector<HTMLElement>('#beep-guide[data-guide-mode="tour"]')?.dataset.beepLogStep
    logBeepEvent('chat_open', tourStep === undefined ? 'character' : 'tour', tourStep === undefined ? undefined : Number(tourStep))
    setGuideRequest(value => value + 1)
  }

  if (!hydrated) return null
  return (
    <>
      {visible && <div ref={actorRef} className={styles.actor} data-companion-actor data-held={held} style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }}
        onPointerEnter={event => { if (event.pointerType !== 'touch') interactWithActor(true) }}
        onPointerLeave={() => { if (!actorRef.current?.contains(document.activeElement)) interactWithActor(false) }}
        onFocusCapture={() => interactWithActor(true)}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.matches(':hover')) interactWithActor(false) }}>

        <div ref={artworkRef} className={styles.artwork} aria-hidden="true" />
        <button ref={gripRef} type="button" className={styles.grip} data-held={held}
          aria-label={language === 'es' ? 'Hablar con Mr. Beep. Arrastra para moverlo; usa las flechas con el teclado.' : 'Chat with Mr. Beep. Drag to move; use arrow keys to move with the keyboard.'}
          title={language === 'es' ? 'Clic para hablar · Arrastra para mover' : 'Click to chat · Drag to move'}
          aria-controls="beep-guide" aria-expanded={guideOpen}
          onPointerDown={pickUp} onPointerMove={carry}
          onPointerUp={event => releasePointer(event)}
          onPointerCancel={event => releasePointer(event, true)} onLostPointerCapture={event => releasePointer(event, true)}
          onContextMenu={event => event.preventDefault()}
          onKeyDown={nudge} onClick={event => {
            event.stopPropagation()
            if (event.detail !== 0 && suppressClick.current) { suppressClick.current = false; return }
            if (!drag.current) openChat()
          }} />
      </div>}
      {visible && <TomGuide ready={status === 'ready'} running={running} openRequest={guideRequest} anchorRef={actorRef} returnFocusRef={gripRef} onOpenChange={setGuideOpen} onSpeakingChange={setGuideSpeaking} onTargetChange={followGuide}
        settings={<>
          <label className={styles.setting}>
            <span>{text.roam}</span>
            <input type="checkbox" checked={wandering} onChange={toggleWandering} />
          </label>
          <label className={styles.setting}>
            <span>{text.animations}</span>
            <input type="checkbox" checked={animations} onChange={event => {
              const enabled = event.currentTarget.checked
              setAnimations(enabled)
              save(visible, wandering, enabled)
            }} />
          </label>
          <button type="button" className={styles.hideCompanion} data-beep-action="visibility_toggle" onClick={() => {
            cancelPress()
            drop()
            setGuideRequest(0)
            setVisible(false)
            save(false)
          }}><EyeOff size={15} aria-hidden="true" />{text.hide}</button>
        </>}
      />}
    </>
  )
}
