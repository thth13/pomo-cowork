'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, X } from 'lucide-react'
import { useLocalStudyTimer } from '@/hooks/useLocalStudyTimer'
import type { ExamTimer } from '@/lib/examPlannerStorage'
import type { PlannedSession } from '@/lib/studyPlanner'
import styles from './StudyPlanner.module.css'

export default function PlannerSessionTimer({ session, breakMinutes, onComplete, onClose, persistent = true, restored, onTimerChange }: {
  session: PlannedSession; breakMinutes: number; onComplete: (id: string) => void; onClose: () => void; persistent?: boolean; restored?: ExamTimer | null; onTimerChange?: (timer: ExamTimer) => void
}) {
  const timer = useLocalStudyTimer(session.minutes * 60, false, restored)
  const [phase, setPhase] = useState<'focus' | 'break'>(restored?.phase ?? 'focus')
  const counted = useRef(false)
  const panel = useRef<HTMLElement>(null)
  const completion = useRef(onComplete)
  completion.current = onComplete
  useEffect(() => { panel.current?.focus() }, [])
  useEffect(() => {
    if (timer.status === 'finished' && phase === 'focus' && !counted.current) {
      counted.current = true
      completion.current(session.id)
    }
  }, [timer.status, phase, session.id])

  const { status: savedStatus, remainingMs, endsAt } = timer.snapshot
  useEffect(() => {
    onTimerChange?.({ phase, status: savedStatus, remainingMs, endsAt })
  }, [phase, savedStatus, remainingMs, endsAt, onTimerChange])

  const status = timer.status === 'finished'
    ? phase === 'focus' ? 'Session complete. Your plan is checked off.' : 'Break complete. Choose your next session.'
    : timer.status === 'running' ? phase === 'focus' ? 'One topic. One session.' : 'Take a little space away from your work.'
      : timer.status === 'paused' ? 'Paused. Resume when you are ready.' : 'Ready when you are.'
  const digits = `${String(Math.floor(timer.seconds / 60)).padStart(2, '0')}:${String(timer.seconds % 60).padStart(2, '0')}`
  return <section ref={panel} className={styles.timer} aria-labelledby="planner-timer-title" tabIndex={-1}>
    <div className={styles.timerHeading}><div><p className={styles.eyebrow}>{phase === 'focus' ? 'Your next small step' : 'Take a break'}</p><h3 id="planner-timer-title">{session.topicName}</h3></div>
      <button type="button" onClick={onClose} className={styles.iconButton} aria-label="Close and reset this timer"><X size={18} aria-hidden="true" /></button></div>
    <div className={styles.clock} role="timer" aria-live="off" aria-label={`${phase === 'focus' ? 'Focus' : 'Break'} time remaining`}>{digits}</div>
    <p role="status" className={styles.timerStatus}>{status}</p>
    <div className={styles.actions}>
      {timer.status !== 'finished' ? <button type="button" className={styles.primary} onClick={timer.status === 'running' ? timer.pause : timer.start}>
        {timer.status === 'running' ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        {timer.status === 'running' ? 'Pause' : timer.status === 'paused' ? 'Resume' : phase === 'focus' ? 'Start focus' : 'Start break'}
      </button> : phase === 'focus' && breakMinutes > 0 ? <button type="button" className={styles.primary} onClick={() => { setPhase('break'); timer.reset(breakMinutes * 60) }}>Prepare {breakMinutes}-minute break</button>
        : <button type="button" className={styles.primary} onClick={onClose}>Back to plan</button>}
      {timer.status !== 'idle' && timer.status !== 'finished' && <button type="button" onClick={() => timer.reset((phase === 'focus' ? session.minutes : breakMinutes) * 60)}><RotateCcw size={16} aria-hidden="true" />Reset timer</button>}
    </div>
    <p className={styles.help}>{onTimerChange ? 'Timer progress is saved with your plan in this browser. A running interval continues while you are away.' : <>This timer runs only on this page. Leaving resets it; {persistent ? 'completed checkmarks stay in this browser.' : 'completion marks last until you leave or rebuild the plan.'}</>} Sessions are not added to account statistics.</p>
  </section>
}

