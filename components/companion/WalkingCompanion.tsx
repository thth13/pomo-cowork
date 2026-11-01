'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { logBeepClick, logBeepEvent } from '@/lib/beepEvents'
import { usePathname } from 'next/navigation'
import type { KeyboardEvent } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { User, MapPin, MessageCircle, Pause, Play, X } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { useTimerStore } from '@/store/useTimerStore'
import { SessionType } from '@/types'
import type { CompanionMood, CompanionPose } from './CompanionScene'
import styles from './WalkingCompanion.module.css'
import TomGuide from './TomGuide'
import type { GuideTarget } from './useBeepTour'
import { BEEP_CELEBRATION_DURATION } from './BeepReactions'

const STORAGE_KEY = 'pomo:walking-companion:v1'
const SHOW_DEBUG_CONTROLS = false
const PICKUP_DELAY_MS = 280
const WALK_SPEED_PX_PER_SECOND = 125
const WANDER_RADIUS_X = 320
const WANDER_RADIUS_Y = 140
const animationPreviews = ['idle', 'focus', 'break', 'happy', 'held', 'speaking', 'completion'] as const
type AnimationPreview = typeof animationPreviews[number]
const previewCopy = {
  en: { title: 'Test animations', hint: 'Preview for 5 seconds. Your timer stays unchanged.', stop: 'Stop preview', idle: 'Idle', focus: 'Work at desk', break: 'Sleepy break', happy: 'Smile', held: 'Surprised / carried', speaking: 'Talking', completion: 'Finish and celebrate' },
  es: { title: 'Probar animaciones', hint: 'Vista previa de 5 segundos. El temporizador no cambia.', stop: 'Detener vista previa', idle: 'En reposo', focus: 'Trabajar en la mesa', break: 'Descanso con sueño', happy: 'Sonreír', held: 'Sorpresa / en brazos', speaking: 'Hablar', completion: 'Terminar y celebrar' },
}
const copy = {
  en: { name: 'Mr. Beep', show: 'Show companion', hide: 'Hide companion', move: 'Move', moving: 'Choose a place', help: 'Click an empty space, or use arrow keys on Move. Escape cancels.', roam: 'Let Mr. Beep wander', stay: 'Stay here', loading: 'Waking up…', error: 'Companion unavailable. Try again.', retry: 'Try again', idle: 'Ready when you are', focus: 'Focusing with you', break: 'Taking a break', close: 'Close companion controls', chat: 'Chat with Mr. Beep' },
  es: { name: 'Mr. Beep', show: 'Mostrar compañero', hide: 'Ocultar compañero', move: 'Mover', moving: 'Elige un lugar', help: 'Haz clic en un espacio vacío o usa las flechas en Mover. Escape cancela.', roam: 'Dejar que Mr. Beep pasee', stay: 'Quedarse aquí', loading: 'Despertando…', error: 'Compañero no disponible. Inténtalo de nuevo.', retry: 'Reintentar', idle: 'Listo cuando tú quieras', focus: 'Concentrándome contigo', break: 'De descanso', close: 'Cerrar controles del compañero', chat: 'Hablar con Mr. Beep' },
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
  const previewText = previewCopy[language]
  const [preview, setPreview] = useState<{ kind: AnimationPreview; started: number } | null>(null)
  const previewRef = useRef(preview)
  previewRef.current = preview
  const running = useTimerStore(state => state.isRunning)
  const sessionType = useTimerStore(state => state.currentSession?.type)
  const mood: CompanionMood = !running ? 'idle' : sessionType === SessionType.SHORT_BREAK || sessionType === SessionType.LONG_BREAK ? 'break' : 'focus'
  const [visible, setVisible] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [moving, setMoving] = useState(false)
  const [wandering, setWandering] = useState(true)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const artworkRef = useRef<HTMLDivElement>(null)
  const actorRef = useRef<HTMLDivElement>(null)
  const gripRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const interacting = useRef(false)
  const target = useRef({ x: 0.2, y: 0.8 })
  const position = useRef({ x: 0.2, y: 0.8 })
  const home = useRef({ x: 0.2, y: 0.8 })
  const press = useRef<{ id: number; timer: ReturnType<typeof setTimeout> } | null>(null)
  const suppressClick = useRef(false)
  const drag = useRef<{ id: number; offsetX: number; offsetY: number; lastX: number; lastTime: number; start: { x: number; y: number } } | null>(null)
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
      setMoving(false)
      setPreview(null)
    } else target.current = { ...home.current }
  }, [])
  const pose = useRef<CompanionPose>({ mood, walking: false, direction: 1, reducedMotion: false })
  pose.current.mood = mood
  pose.current.speaking = guideSpeaking
  const roaming = useRef(wandering)
  roaming.current = wandering && !moving && !guideOpen && !preview

  useEffect(() => {
    if (!preview) return
    const timeout = window.setTimeout(() => setPreview(null), 5000)
    return () => window.clearTimeout(timeout)
  }, [preview])

  useEffect(() => {
    if (!visible) {
      setPreview(null)
      interacting.current = false
      pose.current.hovered = false
    }
  }, [visible])

  function startPreview(kind: AnimationPreview) {
    target.current = { ...position.current }
    setMoving(false)
    setPreview({ kind, started: performance.now() / 1000 })
  }

  useEffect(() => useTimerStore.subscribe((state, previous) => {
    if (state.completionSequence !== previous.completionSequence && !document.hidden) {
      target.current = { ...position.current }
      pose.current.celebrateUntil = performance.now() / 1000 + BEEP_CELEBRATION_DURATION
    }
  }), [])

  useEffect(() => {
    if (guideOpen) target.current = { ...position.current }
  }, [guideOpen])

  const save = useCallback((nextVisible = visible) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ visible: nextVisible, ...home.current })) } catch { /* Optional preference; keep the in-memory companion usable. */ }
  }, [visible])

  function cancelPress() {
    const pending = press.current
    if (!pending) return
    clearTimeout(pending.timer)
    press.current = null
    suppressClick.current = true
    if (gripRef.current?.hasPointerCapture(pending.id)) gripRef.current.releasePointerCapture(pending.id)
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
    previewRef.current = null
    setPreview(null)
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = actorRef.current!.getBoundingClientRect()
    const initial = { id: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, lastX: event.clientX, lastTime: event.timeStamp, start: { ...position.current } }
    target.current = { ...position.current }
    setMoving(false)
    press.current = { id: event.pointerId, timer: setTimeout(() => {
      press.current = null
      suppressClick.current = true
      drag.current = initial
      pose.current.held = true
      pose.current.celebrateUntil = 0
      pose.current.dragVelocity = 0
      setHeld(true)
    }, PICKUP_DELAY_MS) }
  }

  function releasePointer(event: ReactPointerEvent<HTMLButtonElement>, cancel = false) {
    if (drag.current?.id === event.pointerId) { drop(cancel); return }
    if (press.current?.id !== event.pointerId) return
    if (cancel) { cancelPress(); return }
    clearTimeout(press.current.timer)
    press.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function carry(event: ReactPointerEvent<HTMLButtonElement>) {
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
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (saved && typeof saved.visible === 'boolean') setVisible(saved.visible)
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
          const step = state.held || previewRef.current ? 0 : destination || state.reducedMotion ? 1 : scene?.canMove() ? Math.min(1, dt * WALK_SPEED_PX_PER_SECOND / Math.max(distance, 1)) : 0
          position.current.x += (target.current.x - position.current.x) * step
          position.current.y += (target.current.y - position.current.y) * step
          if (actorRef.current) actorRef.current.style.transform = `translate3d(${position.current.x * width}px, ${8 + position.current.y * height}px, 0)`
          state.pointAt = destination && distance * (1 - step) < 8 ? {
            x: destination.pointX - position.current.x * width,
            y: destination.pointY - (8 + position.current.y * height),
          } : undefined
          let rendered = destination ? { ...state, mood: 'idle' as const, hovered: false, celebrateUntil: 0 } : state
          const activePreview = previewRef.current
          if (activePreview) {
            const { kind, started } = activePreview
            const finishAt = started + 0.8
            rendered = {
              ...state,
              mood: kind === 'focus' || kind === 'completion' && now / 1000 < finishAt ? 'focus' : kind === 'break' ? 'break' : 'idle',
              walking: false,
              held: kind === 'held',
              hovered: kind === 'happy',
              speaking: kind === 'speaking',
              dragVelocity: kind === 'held' ? Math.sin(now / 450) * 500 : 0,
              celebrateUntil: kind === 'completion' && now / 1000 >= finishAt ? finishAt + BEEP_CELEBRATION_DURATION : 0,
            }
          }
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
  }, [hydrated, visible, attempt])

  useEffect(() => {
    if (!expanded) return
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !panelRef.current?.contains(event.target)) setExpanded(false)
    }
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false)
        setMoving(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [expanded])

  useEffect(() => {
    if (!moving) return
    const choose = (event: MouseEvent) => {
      if (document.querySelector('[aria-modal="true"]')) return
      if (!(event.target instanceof Element) || event.target.closest('a, button, input, textarea, select, label, summary, [role="button"], [role="menu"], [contenteditable], [data-companion-controls], [data-companion-actor]')) return
      target.current = {
        x: Math.max(0, Math.min(1, (event.clientX - 72) / Math.max(1, window.innerWidth - 144))),
        y: Math.max(0, Math.min(1, (event.clientY - 120) / Math.max(1, window.innerHeight - 230))),
      }
      home.current = { ...target.current }
      save()
      setMoving(false)
    }
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setMoving(false) }
    document.addEventListener('click', choose)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('click', choose)
      document.removeEventListener('keydown', escape)
    }
  }, [moving, save])

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
      save()
    }
    setWandering(value => !value)
  }

  function interactWithActor(active: boolean) {
    interacting.current = active
    pose.current.hovered = active
    if (active && !guideTarget.current && !drag.current) target.current = { ...position.current }
  }

  function openChat(surface: 'character' | 'controls' = 'character') {
    cancelPress()
    drop()
    target.current = { ...position.current }
    previewRef.current = null
    setPreview(null)
    setExpanded(false)
    setMoving(false)
    const tourStep = document.querySelector<HTMLElement>('#beep-guide[data-guide-mode="tour"]')?.dataset.beepLogStep
    logBeepEvent('chat_open', tourStep === undefined ? surface : 'tour', tourStep === undefined ? undefined : Number(tourStep))
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

        <div key={`beep-pomo-${attempt}`} ref={artworkRef} className={styles.artwork} aria-hidden="true" />
        <button ref={gripRef} type="button" className={styles.grip} data-held={held}
          aria-label={language === 'es' ? 'Hablar con Mr. Beep. Mantén pulsado para moverlo; usa las flechas con el teclado.' : 'Chat with Mr. Beep. Hold to carry; use arrow keys to move with the keyboard.'}
          title={language === 'es' ? 'Clic para hablar · Mantén pulsado para mover' : 'Click to chat · Hold to carry'}
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
      {SHOW_DEBUG_CONTROLS && <div data-beep-log-surface="controls" onClickCapture={logBeepClick} className={styles.controls} ref={panelRef} data-companion-controls>
        {expanded && <div id="companion-controls" className={styles.panel} data-beep-surface>
          <div className={styles.heading}><strong>{text.name}</strong><button type="button" data-beep-action="controls_close" aria-label={text.close} onClick={() => { setExpanded(false); triggerRef.current?.focus() }}><X size={16} /></button></div>
          <p role="status">{!visible ? text.show : status === 'loading' ? text.loading : status === 'error' ? text.error : text[mood]}</p>
          <button type="button" className={styles.visibility} onClick={() => openChat('controls')}><MessageCircle size={15} />{language === 'es' ? 'Preguntar a Mr. Beep' : 'Ask Mr. Beep'}</button>
          {visible && status === 'error' && <button type="button" data-beep-action="model_retry" onClick={() => setAttempt(value => value + 1)}>{text.retry}</button>}
          {visible && status === 'ready' && <>
            <div className={styles.actions}>
              <button type="button" data-beep-action="move_toggle" aria-pressed={moving} aria-describedby="companion-move-help" onKeyDown={nudge} onClick={() => setMoving(value => !value)}><MapPin size={15} />{moving ? text.moving : text.move}</button>
              <button type="button" data-beep-action="wander_toggle" aria-pressed={wandering} onClick={toggleWandering}>{wandering ? <Pause size={15} /> : <Play size={15} />}{wandering ? text.stay : text.roam}</button>
            </div>
            <p id="companion-move-help" className={styles.help}>{text.help}</p>
            <fieldset className={styles.previews} disabled={held}>
              <legend>{previewText.title}</legend>
              <p className={styles.help}>{previewText.hint}</p>
              <div className={styles.previewButtons}>
                {animationPreviews.map(kind => <button key={kind} data-beep-action={`preview_${kind}`} type="button" aria-pressed={preview?.kind === kind} onClick={() => startPreview(kind)}>{previewText[kind]}</button>)}
              </div>
              {preview && <>
                <p className={styles.previewStatus} role="status">{previewText[preview.kind]}</p>
                <button type="button" className={styles.visibility} data-beep-action="preview_stop" onClick={() => setPreview(null)}>{previewText.stop}</button>
              </>}
            </fieldset>
          </>}
          <button type="button" className={styles.visibility} data-beep-action="visibility_toggle" onClick={() => { cancelPress(); drop(); setVisible(value => !value); setMoving(false); save(!visible) }}>{visible ? text.hide : text.show}</button>
        </div>}
        <button ref={triggerRef} data-beep-action={expanded ? 'controls_close' : 'controls_open'} type="button" className={styles.trigger} data-beep-surface aria-expanded={expanded} aria-controls="companion-controls" onClick={() => setExpanded(value => !value)}><User size={16} />{text.name}</button>
        {moving && !expanded && <span className={styles.moveHint} data-beep-surface role="status">{text.moving} · Esc</span>}
      </div>}
      <TomGuide ready={visible && status === 'ready' && !preview} running={running} openRequest={guideRequest} anchorRef={actorRef} returnFocusRef={gripRef} onOpenChange={setGuideOpen} onSpeakingChange={setGuideSpeaking} onTargetChange={followGuide} />
    </>
  )
}
