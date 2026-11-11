'use client'

import { useEffect, useState } from 'react'
import ActivityChart, { type ActivityPeriod } from '@/components/ActivityChart'
import { useI18n } from '@/components/I18nProvider'
import { communityCopy } from '@/lib/i18n/community'
import type { RoomStats } from '@/types'

export default function RoomActivityChart({ roomId, token, initialStats }: {
  roomId: string
  token: string | null
  initialStats: RoomStats | null
}) {
  const { language } = useI18n()
  const copy = communityCopy[language]
  const [period, setPeriod] = useState<ActivityPeriod>('7')
  const [offset, setOffset] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; data: RoomStats } | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const key = `${roomId}:${token}:${period}:${offset}:${attempt}`
  const data = period === '7' && offset === 0 && initialStats
    ? initialStats : result?.key === key ? result.data : null
  const failed = failedKey === key
  const loading = !data && !failed

  useEffect(() => {
    if (period === '7' && offset === 0 && initialStats) return
    const controller = new AbortController()
    void (async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}/stats?activityPeriod=${period}&activityOffset=${offset}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Unable to load activity')
        const next: RoomStats = await response.json()
        if (!controller.signal.aborted) setResult({ key, data: next })
      } catch {
        if (!controller.signal.aborted) setFailedKey(key)
      }
    })()
    return () => controller.abort()
  }, [roomId, token, period, offset, initialStats, key])

  return <section className="community-panel room-weekly-activity" aria-busy={loading}>
    <header className="community-panel-heading"><h2>{copy.weekly}</h2></header>
    {failed && <div className="community-error" role="alert">
      {copy.statsUnavailable} <button type="button" className="community-button" onClick={() => setAttempt(value => value + 1)}>{copy.retry}</button>
    </div>}
    <div className="relative community-chart">
      {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--pixel-paper)]/70" role="status" aria-label={language === 'es' ? 'Cargando' : 'Loading'}>
        <div className="h-5 w-5 border-2 border-[var(--pixel-accent)] border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
      </div>}
      <ActivityChart stats={data} activityPeriod={period} activityOffset={offset}
        onPeriodChange={next => { setPeriod(next); setOffset(0) }}
        onOffsetChange={direction => setOffset(value => direction === 'prev' ? Math.min(1000, value + 1) : Math.max(0, value - 1))} />
    </div>
  </section>
}
