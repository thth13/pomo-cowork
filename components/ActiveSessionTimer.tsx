'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/components/I18nProvider'
import { communityCopy } from '@/lib/i18n/community'

interface ActiveSession {
  id: string
  task: string
  type: string
  startedAt: string
  duration: number
}

interface ActiveSessionTimerProps {
  activeSession: ActiveSession | undefined
  isUserOnline: boolean
  isUserWorking: boolean
}

export default function ActiveSessionTimer({ activeSession, isUserOnline, isUserWorking }: ActiveSessionTimerProps) {
  const { language } = useI18n()
  const copy = communityCopy[language]
  const typeLabel = activeSession?.type === 'SHORT_BREAK' ? copy.shortBreak : activeSession?.type === 'LONG_BREAK' ? copy.longBreak : activeSession?.type === 'TIME_TRACKING' ? copy.tracking : copy.work
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!activeSession) {
      setTimeRemaining(null)
      setProgress(0)
      return
    }

    const calculateTimeRemaining = () => {
      const startTime = new Date(activeSession.startedAt).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)
      const totalDuration = activeSession.duration * 60
      const remaining = Math.max(0, totalDuration - elapsed)
      
      const mins = Math.floor(remaining / 60)
      const secs = remaining % 60
      
      const progressPercent = totalDuration > 0 ? Math.max(0, Math.min(100, (elapsed / totalDuration) * 100)) : 0
      setProgress(progressPercent)
      
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    setTimeRemaining(calculateTimeRemaining())
    
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining())
    }, 1000)

    return () => clearInterval(interval)
  }, [activeSession])

  return (
    <section className="profile-live" aria-label={copy.working}>
      <header className="profile-live-heading"><span><span className="profile-live-dot" data-online={isUserOnline} aria-hidden="true" />{isUserOnline ? copy.online : copy.offline}</span>{isUserWorking && <span>{typeLabel}</span>}</header>
      {isUserWorking && activeSession ? <>
        <p className="profile-live-task">{activeSession.task || typeLabel}</p>
        <div className="profile-live-time"><span>{copy.working}</span><strong role="timer" aria-live="off">{timeRemaining ?? '—:—'}</strong></div>
        <progress value={progress} max={100} aria-label={typeLabel} />
      </> : <p className="profile-live-empty">{copy.notWorking}</p>}
    </section>
  )
}
