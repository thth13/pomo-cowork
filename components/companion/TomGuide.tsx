'use client'

import { useEffect, useRef, useState, type RefObject, type SetStateAction } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BEEP_GUIDE_MODAL_SELECTOR, useBeepTour, type GuideTarget } from './useBeepTour'
import { useAuthStore } from '@/store/useAuthStore'
import BeepChat from './BeepChat'
import { beepIntroduction } from '@/lib/beepIntroduction'
import type { BeepMessage, BeepConversationInfo } from '@/lib/beepChat'
import { X, History } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import styles from './WalkingCompanion.module.css'

const SEEN_KEY = 'pomo:tom-introduction:v1'
const messages = {
  en: {
    name: 'Mr. Beep, your focus buddy', close: 'Close Mr. Beep’s tips', skip: 'Maybe later', next: 'Next', back: 'Back', done: 'Let’s focus', tour: 'Show me around again', help: 'What can I help with?', progress: 'Tip',
    action: 'Try the highlighted control, or press Next.',
    optionalAction: 'Try the highlighted control, or press Next.',
    intro: [
      [beepIntroduction.en.title, beepIntroduction.en.body],
      ['Open your tasks', 'Click the highlighted Tasks button. On a phone, open the highlighted menu first, then choose Tasks. Projects and their tasks live here.'],
      ['Create your first project', 'Click the highlighted field and give your project a name, like “Learn Spanish”. Choose a color if you like, then press the arrow or Add project. Save it to continue, or press Next to explore first.'],
      ['Add a task to your project', 'In the highlighted field, name one small step, like “Review 10 words”, then press +. You can add more tasks here, check them off, or use the play button to focus on one.'],
      ['Choose what to work on', 'Press ▶ beside your task to start working on it, or choose it from the highlighted dropdown below the timer and press Start when ready. You can also press Next to keep exploring.'],
      ['Keep your progress', 'Create an account to keep your statistics and have your own profile. The highlighted account button opens registration. You can register now or press Next.'],
      ['Find your focus sound', 'Open Sounds to choose background audio and mix sounds that help you concentrate. Try it, or press Next.'],
      ['See your progress', 'Your Progress shows your rank, XP and streak, alongside today’s community focus totals. Open it, or press Next.'],
      ['Set a daily goal', 'Daily Goal lets you choose how many Pomodoros or hours to aim for today and see how close you are. Open it, or press Next.'],
      ['Build your habits', 'Habits lets you check off daily routines and follow your consistency. Open it, or press Next.'],
      ['Look back at your work', 'Work History shows your past focus sessions so you can review what you worked on. Open it, or press Next.'],
      ['Say hello', 'Chat is where you can talk with people sharing the workspace. Open it, or press Next.'],
      ['You’re ready to focus', 'You know your way around! Start with one small task. I’ll stay nearby — open Ask Mr. Beep whenever you need a reminder.'],
    ],
    topics: [
      ['How do I start?', 'On the timer page, choose a session and press Start. Pause takes a breather; Resume continues. Stop ends the current session. Change durations using the timer’s settings button.'],
      ['How do breaks work?', 'Choose Short Break or Long Break on the timer. Press Start if the break hasn’t started. You can check the timer settings for automatic starts and change the break lengths.'],
      ['Where are my tasks?', 'On the timer page, open Tasks in the tools dock, or in the menu on mobile. Create a project, add tasks inside it, and select what you want to focus on.'],
      ['How do I work with others?', 'Open Rooms from the navigation to choose a coworking space. The Currently Working area shows live sessions; people can each work on their own timer.'],
      ['How can I move or hide you?', 'Click me to chat. Hold me briefly, then drag and let go to put me down. I wander only near where you place me. Escape cancels a drag. Move lets you choose an empty spot, and arrow keys work on Move or my head. Stay here pauses my wandering; Hide companion puts me away.'],
    ],
    timer: 'Go to timer', rooms: 'Browse rooms',
  },
  es: {
    name: 'Mr. Beep, tu compañero', close: 'Cerrar los consejos de Mr. Beep', skip: 'Más tarde', next: 'Siguiente', back: 'Atrás', done: 'A concentrarse', tour: 'Volver a ver la guía', help: '¿En qué puedo ayudarte?', progress: 'Consejo',
    action: 'Prueba el control resaltado o pulsa Siguiente.',
    optionalAction: 'Prueba el control resaltado o pulsa Siguiente.',
    intro: [
      [beepIntroduction.es.title, beepIntroduction.es.body],
      ['Abre tus tareas', 'Pulsa el botón Tareas resaltado. En el móvil, abre primero el menú resaltado y elige Tareas. Aquí encontrarás tus proyectos y tareas.'],
      ['Crea tu primer proyecto', 'Pulsa el campo resaltado y escribe un nombre, como “Aprender inglés”. Puedes elegir un color. Después, pulsa la flecha o Añadir proyecto. Guárdalo para continuar o pulsa Siguiente para explorar primero.'],
      ['Añade una tarea al proyecto', 'En el campo resaltado, escribe un paso pequeño, como “Repasar 10 palabras”, y pulsa +. Aquí puedes añadir más tareas, completarlas o usar el botón de reproducción para concentrarte en una.'],
      ['Elige en qué trabajar', 'Pulsa ▶ junto a tu tarea para empezar, o selecciónala en el menú resaltado debajo del temporizador y pulsa Iniciar cuando quieras. También puedes pulsar Siguiente para seguir explorando.'],
      ['Conserva tu progreso', 'Crea una cuenta para conservar tus estadísticas y tener tu propio perfil. El botón de cuenta resaltado abre el registro. Puedes registrarte ahora o pulsar Siguiente.'],
      ['Encuentra tu sonido', 'Abre Sonidos para elegir audio de fondo y mezclar sonidos que te ayuden a concentrarte. Pruébalo o pulsa Siguiente.'],
      ['Consulta tu progreso', 'Tu progreso muestra tu rango, XP y racha, junto con los totales de concentración de la comunidad de hoy. Ábrelo o pulsa Siguiente.'],
      ['Fija una meta diaria', 'Meta diaria permite elegir cuántos Pomodoros u horas quieres dedicar hoy y ver cuánto te falta. Ábrela o pulsa Siguiente.'],
      ['Crea hábitos', 'Hábitos permite marcar tus rutinas diarias y seguir tu constancia. Ábrelo o pulsa Siguiente.'],
      ['Revisa tu trabajo', 'El historial muestra tus sesiones de concentración anteriores para revisar en qué trabajaste. Ábrelo o pulsa Siguiente.'],
      ['Saluda a los demás', 'El chat permite conversar con las personas que comparten este espacio. Ábrelo o pulsa Siguiente.'],
      ['Todo listo para concentrarte', '¡Ya conoces el espacio! Empieza por una tarea pequeña. Estaré cerca: abre Preguntar a Mr. Beep cuando necesites un recordatorio.'],
    ],
    topics: [
      ['¿Cómo empiezo?', 'En el temporizador, elige una sesión y pulsa Iniciar. Pausar hace una pausa; Reanudar continúa. Detener termina la sesión actual. Puedes cambiar la duración con el botón de ajustes.'],
      ['¿Cómo funcionan los descansos?', 'Elige Descanso corto o Descanso largo. Pulsa Iniciar si no ha comenzado. En los ajustes puedes revisar el inicio automático y cambiar la duración de los descansos.'],
      ['¿Dónde están mis tareas?', 'En la página del temporizador, abre Tareas en la barra de herramientas o el menú móvil. Crea un proyecto, añade tareas dentro y selecciona en qué concentrarte.'],
      ['¿Cómo trabajo con otras personas?', 'Abre Salas en la navegación para elegir un espacio compartido. La zona de personas trabajando muestra sesiones en directo; cada persona puede usar su propio temporizador.'],
      ['¿Cómo te muevo u oculto?', 'Haz clic en mí para hablar. Mantén pulsado un momento, arrástrame y suéltame donde quieras. Solo paseo cerca de donde me dejas. Escape cancela el arrastre. Mover permite elegir un espacio vacío; las flechas funcionan en Mover o mi cabeza. Quedarse aquí detiene mis paseos; Ocultar compañero me guarda.'],
    ],
    timer: 'Ir al temporizador', rooms: 'Ver salas',
  },
}

interface Props {
  ready: boolean
  running: boolean
  openRequest: number
  anchorRef: RefObject<HTMLDivElement>
  returnFocusRef: RefObject<HTMLButtonElement>
  onOpenChange: (open: boolean) => void
  onTargetChange: (target: GuideTarget) => void
  onSpeakingChange: (speaking: boolean) => void
}

export default function TomGuide({ ready, running, openRequest, anchorRef, returnFocusRef, onOpenChange, onTargetChange, onSpeakingChange }: Props) {
  const { language } = useI18n()
  const text = messages[language]
  const pathname = usePathname()
  const registered = useAuthStore(state => state.isAuthenticated && Boolean(state.user) && !state.user?.isAnonymous)
  const [mode, setMode] = useState<'tour' | 'help' | 'welcome' | null>(null)
  const [step, setStep] = useState(0)
  const accountToken = useAuthStore(state => state.token)
  const [savedChat, setSavedChat] = useState<BeepConversationInfo | null>(null)
  const authLoading = useAuthStore(state => state.isLoading)
  const accountId = useAuthStore(state => state.user?.id)
  const welcomed = useRef(new Set<string>())
  const [welcome, setWelcome] = useState<{ owner: string; text: string } | null>(null)
  const [conversation, setConversation] = useState<{ owner: string | null; messages: BeepMessage[] }>({ owner: accountToken, messages: [] })
  const chatMessages = conversation.owner === accountToken ? conversation.messages : []
  const setChatMessages = (next: SetStateAction<BeepMessage[]>) => {
    setConversation(previous => ({ owner: accountToken, messages: typeof next === 'function' ? next(previous.owner === accountToken ? previous.messages : []) : next }))
  }
  useEffect(() => {
    setConversation({ owner: accountToken, messages: [] })
    setWelcome(null)
    setSavedChat(null)
    setMode(null)
  }, [accountToken])
  useEffect(() => {
    onSpeakingChange(mode === 'tour' || mode === 'welcome')
    const timeout = mode === 'welcome' ? setTimeout(() => onSpeakingChange(false), 4000) : undefined
    return () => { clearTimeout(timeout); onSpeakingChange(false) }
  }, [mode, onSpeakingChange])
  useEffect(() => {
    if (mode !== 'welcome') return
    const timeout = setTimeout(() => setMode(current => current === 'welcome' ? null : current), 20_000)
    return () => clearTimeout(timeout)
  }, [mode])
  const bubbleRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const seen = useRef(false)

  useBeepTour(mode === 'tour' && ready && !authLoading && !registered, step, () => setStep(value => Math.min(value + 1, text.intro.length - 1)), onTargetChange, bubbleRef)

  useEffect(() => {
    if (registered) setMode(current => current === 'tour' ? null : current)
  }, [registered])

  useEffect(() => { if (pathname !== '/') setMode(null) }, [pathname])

  useEffect(() => {
    try { seen.current = localStorage.getItem(SEEN_KEY) === 'seen' } catch { /* Fall back to this mounted visit. */ }
  }, [])

  useEffect(() => {
    if (pathname !== '/' || !ready || running || authLoading || registered || seen.current || mode) return
    let timeout: ReturnType<typeof setTimeout>
    const greet = () => {
      const auth = useAuthStore.getState()
      if (auth.isLoading || auth.isAuthenticated && auth.user && !auth.user.isAnonymous) return
      if (document.hidden || document.querySelector(BEEP_GUIDE_MODAL_SELECTOR)) { timeout = setTimeout(greet, 2000); return }
      seen.current = true
      try { localStorage.setItem(SEEN_KEY, 'seen') } catch { /* Avoid repeat greetings during this visit even without storage. */ }
      setStep(0)
      setMode('tour')
    }
    timeout = setTimeout(greet, 1500)
    return () => clearTimeout(timeout)
  }, [ready, running, mode, pathname, authLoading, registered])

  useEffect(() => {
    if (pathname !== '/' || !ready || running || mode || authLoading || !registered || !accountToken || !accountId || chatMessages.length > 0 || welcomed.current.has(accountId)) return
    const welcomeAccounts = welcomed.current
    const controller = new AbortController()
    let settled = false
    let started = false
    let timeout: ReturnType<typeof setTimeout>
    const showWelcome = async () => {
      if (document.hidden || document.querySelector(BEEP_GUIDE_MODAL_SELECTOR)) { timeout = setTimeout(showWelcome, 1500); return }
      started = true
      welcomeAccounts.add(accountId)
      const abortTimeout = setTimeout(() => controller.abort(), 35_000)
      try {
        const query = new URLSearchParams({ language, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
        const response = await fetch(`/api/beep/chat?${query}`, {
          headers: { Authorization: `Bearer ${accountToken}` }, signal: controller.signal, cache: 'no-store',
        })
        if (!response.ok) return
        const result = await response.json() as { message?: string | null }
        if (controller.signal.aborted || useAuthStore.getState().token !== accountToken || !result.message || document.hidden || document.querySelector(BEEP_GUIDE_MODAL_SELECTOR)) return
        setWelcome({ owner: accountToken, text: result.message.slice(0, 400) })
        setMode('welcome')
      } catch { /* A welcome is optional; the chat remains available. */ }
      finally { settled = true; clearTimeout(abortTimeout) }
    }
    timeout = setTimeout(showWelcome, 1500)
    return () => {
      clearTimeout(timeout)
      controller.abort()
      if (started && !settled) welcomeAccounts.delete(accountId)
    }
  }, [pathname, ready, running, mode, authLoading, registered, accountToken, accountId, language, chatMessages.length])

  useEffect(() => {
    if (!openRequest) return
    seen.current = true
    try { localStorage.setItem(SEEN_KEY, 'seen') } catch { /* Optional local preference. */ }
    setMode('help')
    const frame = requestAnimationFrame(() => bubbleRef.current?.querySelector('textarea')?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [openRequest])

  useEffect(() => {
    onOpenChange(mode !== null)
    return () => onOpenChange(false)
  }, [mode, onOpenChange])

  useEffect(() => {
    if (!mode) return
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector(BEEP_GUIDE_MODAL_SELECTOR)) return
      setMode(null)
      returnFocusRef.current?.focus({ preventScroll: true })
    }
    document.addEventListener('keydown', dismiss, true)
    let frame = 0
    const place = () => {
      const bubble = bubbleRef.current
      if (bubble) {
        const anchor = ready ? anchorRef.current?.getBoundingClientRect() : undefined
        const viewport = window.visualViewport
        const left = viewport?.offsetLeft || 0
        const top = viewport?.offsetTop || 0
        const right = left + (viewport?.width || window.innerWidth)
        const bottom = top + (viewport?.height || window.innerHeight)
        bubble.style.maxWidth = `${Math.max(1, right - left - 24)}px`
        bubble.style.maxHeight = `${Math.max(44, Math.min(mode === 'tour' ? Infinity : 560, bottom - top - 92))}px`
        const activeTarget = document.querySelector<HTMLElement>('[data-beep-tour-active="primary"]')?.getBoundingClientRect()
        const aboveSpace = activeTarget ? activeTarget.top - top - 24 : 0
        const belowSpace = activeTarget ? bottom - activeTarget.bottom - 24 : 0
        if (activeTarget) bubble.style.maxHeight = `${Math.max(160, Math.max(aboveSpace, belowSpace))}px`
        const width = bubble.offsetWidth
        const height = bubble.offsetHeight
        const x = Math.max(left + 12, Math.min(right - width - 12, (anchor?.left || 12) + 85))
        const above = (anchor?.top || bottom - 68) - height - 8
        let y = above >= top + 12 ? above : (anchor?.bottom || top) + 8
        if (activeTarget) {
          y = aboveSpace >= height || aboveSpace >= belowSpace ? activeTarget.top - height - 12 : activeTarget.bottom + 12
        }
        bubble.style.left = `${x}px`
        bubble.style.top = `${Math.max(top + 12, Math.min(bottom - height - (activeTarget ? 12 : 68), y))}px`
      }
      frame = requestAnimationFrame(place)
    }
    frame = requestAnimationFrame(place)
    return () => { document.removeEventListener('keydown', dismiss, true); cancelAnimationFrame(frame) }
  }, [mode, ready, anchorRef, returnFocusRef])

  if (!mode || mode === 'tour' && (authLoading || registered) || mode === 'welcome' && welcome?.owner !== accountToken) return null
  const close = () => { setMode(null); returnFocusRef.current?.focus({ preventScroll: true }) }
  const current = text.intro[step]
  return (
    <section id="beep-guide" ref={bubbleRef} className={`${styles.tomBubble} ${styles.controls}`} data-companion-controls data-beep-surface data-guide-mode={mode} aria-labelledby={mode === 'tour' ? 'tom-guide-title' : undefined} aria-label={mode !== 'tour' ? 'Mr. Beep' : undefined}>
      <div className={styles.heading}>
        <span className={styles.tomName}>{mode !== 'tour' ? 'Mr. Beep' : text.name}{mode === 'tour' && <span> · {text.progress} {step + 1 - (registered && step >= 5 ? 1 : 0)}/{text.intro.length - (registered ? 1 : 0)}</span>}</span>
        <div className={styles.chatToolbar}>
          {mode === 'help' && <Link href="/beep" aria-label={language === 'es' ? 'Conversaciones guardadas' : 'Saved conversations'} title={language === 'es' ? 'Conversaciones guardadas' : 'Saved conversations'}><History size={16} strokeWidth={1.5} aria-hidden="true" /></Link>}
          <button type="button" className={styles.chatClose} aria-label={text.close} onClick={close}><X size={16} strokeWidth={1.5} aria-hidden="true" /></button>
        </div>
      </div>
      <div className={mode !== 'tour' ? 'sr-only' : styles.tomContent} aria-live={mode === 'tour' ? 'polite' : undefined} aria-atomic="true">
        <h2 ref={headingRef} id="tom-guide-title" tabIndex={-1}>{mode === 'tour' ? current[0] : text.help}</h2>
        {mode === 'tour' && <p>{current[1]}</p>}
        {mode === 'tour' && step > 0 && step < text.intro.length - 1 && <p className={styles.tourHint}>{step >= 4 ? text.optionalAction : text.action}</p>}
      </div>
      {mode === 'welcome' && welcome && <button type="button" className={styles.welcomeText}
        onClick={() => {
          setChatMessages(previous => previous.length ? previous : [{ role: 'assistant', content: welcome.text }])
          setMode('help')
          requestAnimationFrame(() => bubbleRef.current?.querySelector('textarea')?.focus({ preventScroll: true }))
        }}>{welcome.text}</button>}
      {mode === 'help' && <BeepChat key={accountToken ?? 'guest'} conversation={savedChat} onConversationChange={setSavedChat} messages={chatMessages} onMessagesChange={setChatMessages} onSpeakingChange={onSpeakingChange} />}
      {mode === 'tour' && <div className={styles.tomFooter}>
        <button type="button" onClick={close}>{text.skip}</button>
        <button type="button" className={styles.tomNext} onClick={step === text.intro.length - 1 ? close : () => setStep(value => value + 1)}>{step === text.intro.length - 1 ? text.done : text.next}</button>
      </div>}
    </section>
  )
}
