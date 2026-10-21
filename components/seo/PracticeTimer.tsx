'use client'

import { useState } from 'react'
import { Pause, Play, RotateCcw, ArrowRight } from 'lucide-react'
import { useLocalStudyTimer } from '@/hooks/useLocalStudyTimer'
import { practiceTimerConfig, type PracticeVariant } from '@/lib/practiceTimerConfig'
import styles from './PracticeLandingPage.module.css'

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds % 3600 / 60)
  const rest = String(seconds % 60).padStart(2, '0')
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${String(minutes).padStart(2, '0')}:${rest}`
}

export default function PracticeTimer({ variant }: { variant: PracticeVariant }) {
  const config = practiceTimerConfig[variant]
  const [stageIndex, setStageIndex] = useState(0)
  const [duration, setDuration] = useState(config.stages[0].minutes * 60)
  const [minutes, setMinutes] = useState(String(config.stages[0].minutes))
  const countUp = variant === 'flow' && stageIndex === 0
  const timer = useLocalStudyTimer(config.stages[0].minutes * 60, countUp)
  const stage = config.stages[stageIndex]
  const running = timer.status === 'running'
  const finished = timer.status === 'finished'
  const locked = timer.status !== 'idle'
  const valid = countUp || (/^\d+$/.test(minutes) && Number(minutes) >= 1 && Number(minutes) <= 180)

  const changeMinutes = (value: string) => {
    setMinutes(value)
    if (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 180) {
      const seconds = Number(value) * 60
      setDuration(seconds)
      timer.reset(seconds)
    }
  }

  const selectStage = (index: number, seconds = config.stages[index].minutes * 60) => {
    setStageIndex(index)
    setDuration(seconds)
    // Flow breaks can include seconds. The field is a whole-minute override.
    setMinutes(String(Math.ceil(seconds / 60)))
    timer.reset(seconds)
  }

  const reset = () => timer.reset(countUp ? 0 : duration)
  const prepareBreak = () => selectStage(1, Math.max(60, Math.ceil(timer.seconds / 5)))
  const status = finished
    ? stageIndex === config.stages.length - 1 ? config.finish : `${stage.label} finished. Prepare the next stage when you are ready.`
    : running ? `${stage.label} is running.` : timer.status === 'paused' ? `${stage.label} is paused. Resume when you are ready.` : 'Ready when you are. Nothing starts automatically.'

  return <section id="focus-timer" className={styles.timer} aria-labelledby="practice-timer-title">
    <div className={styles.timerIntro}>
      <p className={styles.kicker}>Your local timer</p>
      <h2 id="practice-timer-title">{config.name}</h2>
      <p>{config.caption}</p>
      <ol className={styles.stages} aria-label="Session stages">
        {config.stages.map((item, index) => <li key={item.label}>
          <button type="button" aria-pressed={stageIndex === index} disabled={running || timer.status === 'paused' || (variant === 'flow' && index === 1 && stageIndex === 0)} onClick={() => selectStage(index)}>
            <span className={styles.stageNumber} aria-hidden="true">{index + 1}</span>
            <span>{item.label}</span>
            <span className={styles.stageLength}>{variant === 'flow' ? index === 0 ? 'open' : '÷ 5' : `${item.minutes}m`}</span>
          </button>
        </li>)}
      </ol>
      <p className={styles.stageHelp}>{variant === 'flow' ? 'Prepare break uses your elapsed focus time. Reset unlocks the stages.' : 'Stage labels show the default plan. Finish a stage to prepare the next, or Reset to change stages and duration.'}</p>
    </div>
    <div className={styles.instrument}>
      <div className={styles.instrumentHeader}><span>{stage.label}</span><span>{countUp ? 'Counting up' : 'Counting down'}</span></div>
      <div role="timer" aria-live="off" aria-label={`${stage.label}: ${formatTime(timer.seconds)} ${countUp ? 'elapsed' : 'remaining'}`} className={`${styles.digits}${timer.seconds >= 3600 ? ` ${styles.longDigits}` : ''}`}>{formatTime(timer.seconds)}</div>
      {!countUp && <progress className={styles.progress} max={Math.max(1, duration)} value={Math.min(duration, Math.max(0, duration - timer.seconds))} aria-label={`${stage.label} progress`} />}
      {countUp && <div className={styles.flowLine} aria-hidden="true"><svg viewBox="0 0 500 40" focusable="false"><path d="M0 20C40 20 40 4 80 4S120 36 160 36 200 4 240 4 280 36 320 36 360 4 400 4 450 20 500 20" /></svg></div>}
      <p className={styles.prompt}>{stage.prompt}</p>
      <div className={styles.actions}>
        <button className={styles.primary} type="button" disabled={!valid || finished} onClick={running ? timer.pause : timer.start}>
          {running ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
          {running ? 'Pause' : timer.status === 'paused' ? 'Resume' : 'Start'}
        </button>
        <button type="button" onClick={reset}><RotateCcw size={16} aria-hidden="true" />Reset</button>
        {countUp && <button type="button" onClick={prepareBreak} disabled={timer.seconds < 1}>Prepare break <ArrowRight size={16} aria-hidden="true" /></button>}
        {!countUp && <button type="button" disabled={!finished} onClick={() => selectStage((stageIndex + 1) % config.stages.length)}>
          {stageIndex === config.stages.length - 1 ? 'New session' : `Prepare ${config.stages[stageIndex + 1].label.toLowerCase()}`}<ArrowRight size={16} aria-hidden="true" />
        </button>}
      </div>
      <p className={styles.status} role="status" aria-live="polite" aria-atomic="true">{status}</p>
      {!countUp && <div className={styles.settings}>
        <div className={styles.presets} aria-label="Duration presets">
          {config.presets.map(value => <button key={value} type="button" disabled={locked} aria-pressed={duration === value * 60 && valid} onClick={() => changeMinutes(String(value))}>{value} min</button>)}
        </div>
        <label className={styles.duration}>Custom minutes
          <input type="number" inputMode="numeric" min="1" max="180" step="1" value={minutes} disabled={locked} aria-invalid={!valid} aria-describedby="practice-duration-help" onChange={event => changeMinutes(event.target.value)} />
        </label>
        <p id="practice-duration-help" className={styles.fieldHelp}>{!valid ? 'Enter a whole number from 1 to 180 minutes.' : locked ? 'Reset this stage to change its length.' : variant === 'flow' && stageIndex === 1 ? `Prepared break: ${formatTime(duration)}. Enter minutes to override it.` : 'Choose 1–180 whole minutes before starting.'}</p>
      </div>}
      <p className={styles.localNote}>No saved sessions. No effect on your workspace timer. Leaving or reloading clears this clock. Completion is silent.</p>
    </div>
  </section>
}
