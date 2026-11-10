'use client'

import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { LeaderboardPodium, LeaderboardTable } from '@/components/LeaderboardStandings'
import LeaderboardDateFilter, { type LeaderboardDateView } from '@/components/LeaderboardDateFilter'
import { useI18n } from '@/components/I18nProvider'
import { useAuthStore } from '@/store/useAuthStore'
import { communityCopy } from '@/lib/i18n/community'
import { leaderboardCopy } from '@/lib/i18n/leaderboard'
import { isLeaderboardPeriod } from '@/lib/leaderboardPeriod'
import type { RoomStats } from '@/types'

const initialView: LeaderboardDateView = { period: 'month', offset: 0, start: '', end: '' }

function readView(): LeaderboardDateView {
  const params = new URLSearchParams(window.location.search)
  const period = params.get('roomPeriod')
  const start = params.get('roomStartDate') || ''
  const end = params.get('roomEndDate') || ''
  const validRange = Number.isFinite(Date.parse(start)) && Number.isFinite(Date.parse(end)) && Date.parse(start) <= Date.parse(end)
  return {
    period: isLeaderboardPeriod(period) && (period !== 'custom' || validRange) ? period : 'month',
    offset: Math.max(0, Math.min(1000, Number.parseInt(params.get('roomOffset') || '0', 10) || 0)),
    start: validRange ? start : '', end: validRange ? end : '',
  }
}

export default function RoomLeaderboard({ roomId, currentUserId }: { roomId: string; currentUserId?: string }) {
  const { language, t } = useI18n()
  const token = useAuthStore(state => state.token)
  const copy = leaderboardCopy[language]
  const community = communityCopy[language]
  const [view, setView] = useState<LeaderboardDateView>(initialView)
  const [ready, setReady] = useState(false)
  const [data, setData] = useState<(RoomStats & { periodLabel: string | null }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const restore = () => { setView(readView()); setReady(true) }
    restore()
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [])

  const updateView = (patch: Partial<LeaderboardDateView>) => {
    const next = { ...view, ...patch }
    const url = new URL(window.location.href)
    url.searchParams.set('roomPeriod', next.period)
    for (const [key, value] of Object.entries({ roomOffset: next.offset ? String(next.offset) : '', roomStartDate: next.period === 'custom' ? next.start : '', roomEndDate: next.period === 'custom' ? next.end : '' })) {
      if (value) url.searchParams.set(key, value)
      else url.searchParams.delete(key)
    }
    window.history.replaceState(window.history.state, '', url)
    setView(next)
  }

  useEffect(() => {
    if (!ready) return
    const controller = new AbortController()
    let active = true
    let timedOut = false
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort() }, 20000)
    setLoading(true)
    setError(false)
    setData(null)
    const params = new URLSearchParams({ period: view.period, offset: String(view.offset), locale: language })
    if (view.period === 'custom') {
      params.set('startDate', view.start)
      params.set('endDate', view.end)
    }
    fetch(`/api/rooms/${encodeURIComponent(roomId)}/stats?${params}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Room leaderboard request failed')
        const result: RoomStats & { periodLabel: string | null } = await response.json()
        if (active && !controller.signal.aborted) setData(result)
      })
      .catch(() => { if (active && (!controller.signal.aborted || timedOut)) setError(true) })
      .finally(() => {
        window.clearTimeout(timeout)
        if (active && (!controller.signal.aborted || timedOut)) setLoading(false)
      })
    return () => { active = false; window.clearTimeout(timeout); controller.abort() }
  }, [ready, roomId, view.period, view.offset, view.start, view.end, language, token, retry])

  const users = data?.topUsers ?? []

  return (
    <section className="community-panel room-leaderboard" aria-labelledby="room-leaderboard-title" aria-busy={loading}>
      <header className="community-panel-heading">
        <div>
          <h2 id="room-leaderboard-title"><Trophy size={18} aria-hidden="true" />{copy.roomRanking}</h2>
          <p>{copy.roomRankingHint}</p>
        </div>
      </header>
      <LeaderboardDateFilter view={view} onChange={updateView} periodLabel={data?.periodLabel ?? undefined} loading={loading} />
      {loading ? <div className="lb-leaders-loading" role="status">{copy.loading}</div>
        : error ? <div className="lb-state" role="alert"><p>{community.statsUnavailable}</p><button type="button" className="lb-button" onClick={() => setRetry(value => value + 1)}>{t.leaderboard.tryAgain}</button></div>
          : users.length > 0 ? <>
            <LeaderboardPodium users={users} currentUserId={currentUserId} />
            <LeaderboardTable users={users} currentUserId={currentUserId} maxMinutes={users[0].totalMinutes || 1} caption={`${copy.roomRanking} — ${data?.periodLabel ?? ''}`} />
          </> : <p className="community-muted" role="status">{community.noData}</p>}
    </section>
  )
}
