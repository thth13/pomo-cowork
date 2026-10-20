'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, CloudRain, Volume2, VolumeX, Check } from 'lucide-react'
import { useLocalStudyTimer } from '@/hooks/useLocalStudyTimer'
import { localTimerConfig, type LocalTimerVariant } from '@/lib/localTimerConfig'
import styles from './LocalStudyTimer.module.css'

function Scene({ variant }: { variant: LocalTimerVariant }) {
  return <div className={styles.scene} aria-hidden="true">
    {variant === 'cozy' ? <svg viewBox="0 0 400 300" focusable="false">
      <path d="M40 246h320M70 245v-26h160v26M82 218v-20h150v20" fill="var(--local-soft)" stroke="currentColor" strokeWidth="2" />
      <path d="M160 120h120v73c0 53-120 53-120 0zM280 132h17c45 0 39 57-17 54" fill="var(--local-paper)" stroke="currentColor" strokeWidth="3" />
      <ellipse cx="220" cy="120" rx="60" ry="13" fill="var(--local-accent)" />
      <path d="M192 88c-24-22 25-26 0-51M225 88c-24-22 25-26 0-51M256 88c-24-22 25-26 0-51" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M316 245v-71m0 34c-29 0-36-20-29-26 20-3 29 10 29 26m0-12c25 0 33-21 27-27-20 0-27 12-27 27" fill="var(--local-accent)" stroke="currentColor" strokeWidth="2" />
    </svg> : variant === 'rain' ? <div className={styles.window}><span /><span /><span /><span /></div>
      : variant === 'stopwatch' ? <div className={styles.bookmark}>take your time</div>
        : <svg viewBox="0 0 1000 300" preserveAspectRatio="xMidYMax slice" focusable="false">
          <circle cx={variant === 'anime' ? 770 : 500} cy="100" r="65" fill="var(--local-sun)" />
          <path d={variant === 'anime' ? 'M0 260 240 70 450 240 650 160 850 270 1000 200V300H0Z' : 'M0 230Q200 80 420 230T1000 180V300H0Z'} fill="var(--local-soft)" />
          <path d="M0 280Q250 190 480 270T1000 220V300H0Z" fill="var(--local-accent)" opacity=".35" />
          {variant === 'anime' && <path d="m203 100 37-30 36 29-25-6-12 12-14-14z" fill="var(--local-paper)" />}
        </svg>}
  </div>
}

function RainAudio() {
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [pending, setPending] = useState(false)
  const [volume, setVolume] = useState(30)
  const [error, setError] = useState('')
  const request = useRef(0)

  useEffect(() => {
    const element = audio.current
    return () => { request.current += 1; element?.pause() }
  }, [])

  const toggle = async () => {
    const element = audio.current
    if (!element || pending) return
    if (playing) { element.pause(); return }
    const id = ++request.current
    setPending(true)
    setError('')
    element.volume = volume / 100
    try {
      await element.play()
    } catch {
      if (id === request.current) setError('Rain could not play. Check your connection and try again.')
    } finally {
      if (id === request.current) setPending(false)
    }
  }

  return <div className={styles.audio}>
    <audio ref={audio} src="/audio/ambient/rain.mp3" loop preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => { setPlaying(false); setError('Rain could not load. Check your connection and try again.') }} />
    <button type="button" onClick={toggle} disabled={pending} aria-pressed={playing}>
      {playing ? <VolumeX size={16} aria-hidden="true" /> : <CloudRain size={16} aria-hidden="true" />}
      {pending ? 'Loading rain…' : playing ? 'Pause rain' : 'Play rain'}
    </button>
    <label><Volume2 size={16} aria-hidden="true" /><span className={styles.srOnly}>Rain volume</span><input type="range" min="0" max="100" value={volume} aria-valuetext={`${volume}%`} onChange={event => { const value = Number(event.target.value); setVolume(value); if (audio.current) audio.current.volume = value / 100 }} /></label>
    <p role="status">{error}</p>
  </div>
}

export default function LocalStudyTimer({ variant }: { variant: LocalTimerVariant }) {
  const config = localTimerConfig[variant]
  const countUp = variant === 'stopwatch'
  const [phase, setPhase] = useState<'focus' | 'break'>('focus')
  const [focus, setFocus] = useState(String(config.focus))
  const [rest, setRest] = useState(String(config.rest))
  const [intention, setIntention] = useState('')
  const [rounds, setRounds] = useState(0)
  const validMinutes = (value: string) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 180
  const valid = validMinutes(focus) && validMinutes(rest)
  const duration = Number(phase === 'focus' ? focus : rest) * 60
  const timer = useLocalStudyTimer(countUp ? 0 : config.focus * 60, countUp)
  const running = timer.status === 'running'
  const finished = timer.status === 'finished'
  const locked = timer.status !== 'idle'
  const counted = useRef(false)

  useEffect(() => {
    if (finished && phase === 'focus' && !counted.current) {
      counted.current = true
      setRounds(value => value + 1)
    }
  }, [finished, phase])

  const reset = () => {
    counted.current = false
    timer.reset(countUp ? 0 : validMinutes(phase === 'focus' ? focus : rest) ? duration : (phase === 'focus' ? config.focus : config.rest) * 60)
  }
  const nextPhase = () => {
    const next = phase === 'focus' ? 'break' : 'focus'
    setPhase(next)
    counted.current = false
    timer.reset(Number(next === 'focus' ? focus : rest) * 60)
  }
  const setDuration = (value: string, kind: 'focus' | 'break') => {
    if (kind === 'focus') setFocus(value)
    else setRest(value)
    if (kind === phase && validMinutes(value)) timer.reset(Number(value) * 60)
  }
  const hours = Math.floor(timer.seconds / 3600)
  const minutes = Math.floor(timer.seconds / 60) % 60
  const display = `${hours ? `${String(hours).padStart(2, '0')}:` : ''}${String(minutes).padStart(2, '0')}:${String(timer.seconds % 60).padStart(2, '0')}`
  const status = finished ? (countUp ? 'Study session finished. Take a moment to reflect.' : phase === 'focus' ? 'Study complete. Your break is ready when you are.' : 'Break complete. Ready for another chapter?') : running ? (phase === 'focus' ? 'One thing at a time.' : 'Step away. Take a breath.') : timer.status === 'paused' ? 'Paused. Come back when you are ready.' : 'Your time, at your pace.'

  return <section id="focus-timer" className={`${styles.timer} ${styles[variant]}`} aria-labelledby="local-timer-heading" tabIndex={-1}>
    <Scene variant={variant} />
    <aside className={styles.desk}>
      <p className={styles.eyebrow}>{config.name}</p>
      <h2 id="local-timer-heading">{config.caption}</h2>
      <label className={styles.intention}>{config.prompt}<input value={intention} maxLength={120} placeholder={config.placeholder} onChange={event => setIntention(event.target.value)} /></label>
      <p className={styles.tip}>{config.tip}</p>
      <p className={styles.rounds}><Check size={15} aria-hidden="true" />{rounds} {rounds === 1 ? 'study session' : 'study sessions'} completed here</p>
    </aside>
    <div className={styles.instrument}>
      <p className={styles.phase}>{countUp ? 'Study stopwatch' : phase === 'focus' ? 'Time to study' : 'Time for a break'}</p>
      <div className={`${styles.digits}${hours ? ` ${styles.longDigits}` : ''}`} role="timer" aria-live="off" aria-label={countUp ? 'Elapsed study time' : 'Time remaining'}>{display}</div>
      {!countUp && <progress className={styles.progress} aria-label="Interval progress" max={valid && duration > 0 ? duration : 1} value={valid ? Math.max(0, duration - timer.seconds) : 0} />}
      <p className={styles.status} role="status">{status}</p>
      <div className={styles.actions}>
        {finished ? <button type="button" className={styles.primary} onClick={countUp ? reset : nextPhase}>{countUp ? 'New session' : phase === 'focus' ? 'Prepare break' : 'Prepare study'}</button> : <button type="button" className={styles.primary} disabled={!countUp && !valid} onClick={running ? timer.pause : timer.start}>{running ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}{running ? 'Pause' : timer.status === 'paused' ? 'Resume' : countUp ? 'Start studying' : phase === 'break' ? 'Start break' : 'Start studying'}</button>}
        <button type="button" onClick={reset} disabled={timer.status === 'idle'}><RotateCcw size={16} aria-hidden="true" />Reset</button>
        {countUp && locked && !finished && <button type="button" onClick={timer.finish}><Check size={16} aria-hidden="true" />Finish</button>}
      </div>
      {!countUp && <div className={styles.settings}>
        <div className={styles.presets} role="group" aria-label="Study duration">{config.presets.map(value => <button key={value} type="button" aria-pressed={Number(focus) === value} disabled={locked} onClick={() => setDuration(String(value), 'focus')}>{value} min</button>)}</div>
        <div className={styles.fields}>
          <label>Study minutes<input type="number" inputMode="numeric" min="1" max="180" step="1" value={focus} disabled={locked} aria-invalid={!validMinutes(focus)} aria-describedby="local-duration-help" onChange={event => setDuration(event.target.value, 'focus')} /></label>
          <label>Break minutes<input type="number" inputMode="numeric" min="1" max="180" step="1" value={rest} disabled={locked} aria-invalid={!validMinutes(rest)} aria-describedby="local-duration-help" onChange={event => setDuration(event.target.value, 'break')} /></label>
        </div>
        <p id="local-duration-help" className={styles.help}>{!valid ? 'Enter whole minutes from 1 to 180 for both intervals.' : locked ? 'Reset the current interval to change its length.' : 'Choose your rhythm. Each interval starts with a click.'}</p>
      </div>}
      {variant === 'rain' && <RainAudio />}
      <p className={styles.localNote}>Only on this page · No saved sessions · Reloading or leaving resets this timer</p>
      <noscript><p>Enable JavaScript to use the timer controls.</p></noscript>
    </div>
  </section>
}
