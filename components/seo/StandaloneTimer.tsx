'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/components/I18nProvider'
import { useWakeLock } from '@/hooks/useWakeLock'

/** Local practice timer; deliberately does not create coworking/Pomodoro sessions. */
export default function StandaloneTimer({ reading = false }: { reading?: boolean }) {
  const { language } = useI18n()
  const es = language === 'es'
  const [minutes, setMinutes] = useState(reading ? '20' : '60')
  const [stopwatch, setStopwatch] = useState(false)
  const [seconds, setSeconds] = useState((reading ? 20 : 60) * 60)
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [book, setBook] = useState('')
  const anchor = useRef({ at: 0, seconds: 0 })
  const valid = /^\d+$/.test(minutes) && Number(minutes) >= 1 && Number(minutes) <= 1440
  useWakeLock(running)

  useEffect(() => {
    if (!running) return
    const tick = () => {
      const elapsed = Math.floor((Date.now() - anchor.current.at) / 1000)
      const next = stopwatch ? anchor.current.seconds + elapsed : Math.max(0, anchor.current.seconds - elapsed)
      setSeconds(next)
      if (!stopwatch && next === 0) {
        setRunning(false)
        setFinished(true)
      }
    }
    tick()
    const interval = window.setInterval(tick, 200)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', tick) }
  }, [running, stopwatch])

  const reset = (nextStopwatch = stopwatch, nextMinutes = minutes) => {
    setRunning(false)
    setStarted(false)
    setFinished(false)
    const duration = /^\d+$/.test(nextMinutes) && Number(nextMinutes) >= 1 && Number(nextMinutes) <= 1440 ? Number(nextMinutes) : (reading ? 20 : 60)
    setSeconds(nextStopwatch ? 0 : duration * 60)
  }
  const toggle = () => {
    if (running) {
      const elapsed = Math.floor((Date.now() - anchor.current.at) / 1000)
      const remaining = stopwatch ? anchor.current.seconds + elapsed : Math.max(0, anchor.current.seconds - elapsed)
      setSeconds(remaining)
      if (!stopwatch && remaining === 0) setFinished(true)
      setRunning(false)
    } else {
      anchor.current = { at: Date.now(), seconds }
      setStarted(true)
      setRunning(true)
    }
  }
  const display = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`

  return <div className="seo-simple-timer">
    {reading && <label className="seo-tool-field">
      {es ? 'Libro o capítulo' : 'Book or chapter'}
      <input value={book} onChange={event => setBook(event.target.value)} maxLength={160} placeholder={es ? '¿Qué vas a leer?' : 'What are you reading?'} />
    </label>}
    {reading && <div className="seo-tool-options" role="group" aria-label={es ? 'Modo de lectura' : 'Reading mode'}>
      {[false, true].map(mode => <button type="button" key={String(mode)} aria-pressed={stopwatch === mode} disabled={started} onClick={() => { setStopwatch(mode); reset(mode) }}>
        {mode ? (es ? 'Cronómetro' : 'Stopwatch') : (es ? 'Cuenta atrás' : 'Countdown')}
      </button>)}
    </div>}
    {!stopwatch && <div className="seo-countdown-settings">
      <div className="seo-tool-options" role="group" aria-label={es ? 'Minutos' : 'Minutes'}>
        {(reading ? [10, 20, 30] : [30, 60, 90, 120]).map(value => <button type="button" key={value} disabled={started} aria-pressed={Number(minutes) === value} onClick={() => { setMinutes(String(value)); reset(false, String(value)) }}>{value} min</button>)}
      </div>
      <label className="seo-tool-field">{es ? 'Duración en minutos' : 'Duration in minutes'}
        <input type="number" min="1" max="1440" step="1" value={minutes} disabled={started} aria-invalid={!valid} aria-describedby="countdown-help" onChange={event => {
          const value = event.target.value
          setMinutes(value)
          if (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 1440) reset(false, value)
        }} />
      </label>
      <p id="countdown-help">{!valid ? (es ? 'Introduce entre 1 y 1440 minutos enteros.' : 'Enter a whole number from 1 to 1440 minutes.') : (es ? 'Reinicia para cambiar la duración.' : 'Reset to change the duration after starting.')}</p>
    </div>}
    <div className="seo-countdown-digits" role="timer" aria-label={es ? 'Tiempo de lectura o práctica' : 'Reading or practice time'}>{display}</div>
    <p className="seo-completion" role="status">{finished ? (es ? 'Tiempo terminado.' : 'Time is up.') : '\u00a0'}</p>
    <div className="seo-tool-options">
      <button className="seo-button" type="button" onClick={toggle} disabled={(!stopwatch && !valid) || finished}>
        {running ? (es ? 'Pausar' : 'Pause') : started ? (es ? 'Reanudar' : 'Resume') : (es ? 'Iniciar' : 'Start')}
      </button>
      <button type="button" onClick={() => reset()} disabled={!stopwatch && !valid}>{es ? 'Reiniciar' : 'Reset'}</button>
    </div>
    <p className="seo-timer-note">{es ? 'Solo en esta pestaña. No guarda sesiones; al recargar se reinicia. Aviso visual al terminar.' : 'Local to this tab. Sessions are not saved; reloading resets the timer. Completion is a visual notice.'}</p>
  </div>
}
