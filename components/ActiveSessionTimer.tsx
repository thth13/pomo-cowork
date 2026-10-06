'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/components/I18nProvider'
import { communityCopy } from '@/lib/i18n/community'

export interface ProfileActiveSession {
  id: string
  task: string
  type: string
  startedAt: string
  duration: number
  status: string
  pausedAt: string | null
  remainingSeconds: number | null
}

interface ActiveSessionTimerProps {
  activeSession: ProfileActiveSession | null | undefined
  isUserOnline: boolean
  isUserWorking: boolean
}

export default function ActiveSessionTimer({ activeSession, isUserOnline, isUserWorking }: ActiveSessionTimerProps) {
  const { language } = useI18n()
  const copy = communityCopy[language]
  const typeLabel = activeSession?.type === 'SHORT_BREAK' ? copy.shortBreak : activeSession?.type === 'LONG_BREAK' ? copy.longBreak : activeSession?.type === 'TIME_TRACKING' ? copy.tracking : copy.work
  const isTimeTracking = activeSession?.type === 'TIME_TRACKING'
  const isPaused = activeSession?.status === 'PAUSED'
  const [displayTime, setDisplayTime] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!activeSession) {
      setDisplayTime(null)
      setProgress(0)
      return
    }

    const updateTimer = () => {
      const startTime = new Date(activeSession.startedAt).getTime()
      const totalDuration = Math.max(0, activeSession.duration * 60)
      const referenceTime = isPaused
        ? (activeSession.pausedAt ? new Date(activeSession.pausedAt).getTime() : startTime)
        : Date.now()
      const elapsed = Number.isFinite(startTime) && Number.isFinite(referenceTime)
        ? Math.max(0, Math.floor((referenceTime - startTime) / 1000))
        : 0
      const remaining = isPaused && activeSession.remainingSeconds != null
        ? Math.max(0, Math.min(totalDuration, activeSession.remainingSeconds))
        : Math.max(0, totalDuration - elapsed)
      const seconds = isTimeTracking ? Math.max(0, totalDuration - remaining) : remaining
      
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      
      const progressPercent = totalDuration > 0 ? ((totalDuration - remaining) / totalDuration) * 100 : 0
      setProgress(progressPercent)
      setDisplayTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`)
    }

    updateTimer()
    if (isPaused) return

    const interval = setInterval(updateTimer, 1000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') updateTimer()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [activeSession, isTimeTracking, isPaused])

  return (
    <section className="profile-live" aria-label={copy.working}>
      <header className="profile-live-heading"><span><span className="profile-live-dot" data-online={isUserOnline} aria-hidden="true" />{isUserOnline ? copy.online : copy.offline}</span>{isUserWorking && <span>{typeLabel}</span>}</header>
      {isUserWorking && activeSession ? <>
        <p className="profile-live-task">{activeSession.task || typeLabel}</p>
        <div className="profile-live-time"><span>{isPaused ? copy.paused : isTimeTracking ? copy.elapsedTime : copy.working}</span><strong role="timer" aria-live="off">{displayTime ?? '—:—'}</strong></div>
        {!isTimeTracking && <progress value={progress} max={100} aria-label={typeLabel} />}
      </> : <p className="profile-live-empty">{copy.notWorking}</p>}
    </section>
  )
}
