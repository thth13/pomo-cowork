'use client'

import { useEffect, useMemo, useState } from 'react'
import { getEffectiveMinutes } from '@/lib/sessionStats'

interface Session {
  id: string
  type: string
  status: string
  duration: number
  startedAt: string
  endedAt?: string | null
  completedAt?: string | null
  pausedAt?: string | null
  remainingSeconds?: number | null
  createdAt?: string
  user?: {
    id: string
  } | null
}

interface ContributionTotals {
  pomodoros: number
  focusMinutes: number
}

interface ContributionMeta {
  activeUsers: number
}

const emptyTotals: ContributionTotals = {
  pomodoros: 0,
  focusMinutes: 0,
}

export default function TodayContribution() {
  const [totals, setTotals] = useState<ContributionTotals>(emptyTotals)
  const [meta, setMeta] = useState<ContributionMeta>({ activeUsers: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true

    const fetchTodayTotals = async () => {
      try {
        setError(false)
        const token = localStorage.getItem('token')
        const headers: Record<string, string> = {}
        if (token) {
          headers.Authorization = `Bearer ${token}`
        }

        const response = await fetch('/api/sessions/today', { headers })
        if (!response.ok) {
          throw new Error('Failed to load sessions')
        }

        const data = (await response.json()) as Session[]

        if (!active) return

        const now = new Date()
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(now)
        endOfDay.setHours(23, 59, 59, 999)
        const isWithinToday = (session: Session) => {
          const timestamp = session.completedAt ?? session.endedAt ?? session.startedAt
          const date = timestamp ? new Date(timestamp) : null
          if (!date || Number.isNaN(date.getTime())) return false
          return date >= startOfDay && date <= endOfDay
        }

        const completedSessions = data.filter(
          (session) => session.status === 'COMPLETED' && isWithinToday(session)
        )
        const completedPomodoros = completedSessions.filter((session) => session.type === 'WORK')
        const focusSessions = completedSessions.filter(
          (session) => session.type === 'WORK' || session.type === 'TIME_TRACKING'
        )

        const focusMinutes = focusSessions.reduce((sum, session) => {
          return sum + getEffectiveMinutes(session)
        }, 0)

        const uniqueUsers = new Set(
          completedSessions
            .map((session) => session.user?.id)
            .filter((id): id is string => Boolean(id))
        )

        setTotals({
          pomodoros: completedPomodoros.length,
          focusMinutes,
        })
        setMeta({ activeUsers: uniqueUsers.size })
      } catch (fetchError) {
        if (active) {
          setError(true)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchTodayTotals()
    const interval = setInterval(fetchTodayTotals, 30000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const formattedPomodoros = useMemo(() => {
    return totals.pomodoros.toLocaleString('en-US')
  }, [totals.pomodoros])

  const formattedHours = useMemo(() => {
    const hours = Math.round((totals.focusMinutes / 60) * 10) / 10
    const fractionDigits = hours > 0 && hours < 10 ? 1 : 0
    return hours.toLocaleString('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 1,
    })
  }, [totals.focusMinutes])

  const pomodorosLabel = totals.pomodoros === 1 ? 'pomodoro completed' : 'pomodoros completed'
  const hoursLabel = totals.focusMinutes === 60 ? 'hour focused' : 'hours focused'
  const usersLabel = meta.activeUsers === 1 ? 'person contributed today' : 'people contributed today'

  const tomatoIcons = useMemo(() => {
    const cap = 12
    const visible = Math.min(totals.pomodoros, cap)
    return {
      visible,
      overflow: totals.pomodoros - visible
    }
  }, [totals.pomodoros])

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-48 rounded bg-gray-200 dark:bg-slate-700" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 rounded-lg bg-gray-200 dark:bg-slate-700" />
            <div className="h-16 rounded-lg bg-gray-200 dark:bg-slate-700" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-5 shadow-sm dark:border-rose-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500 dark:text-rose-300">
            Today&apos;s contribution
          </p>
          <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            Community focus total
          </h2>
        </div>
        <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-600 dark:bg-rose-400/10 dark:text-rose-200">
          Live
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">{formattedPomodoros}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">{pomodorosLabel}</div>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">{formattedHours}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">{hoursLabel}</div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Pomodoro count</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {Array.from({ length: tomatoIcons.visible }).map((_, index) => (
            <span
              key={`tomato-${index}`}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm ring-1 ring-rose-200/60 dark:bg-slate-900/70 dark:ring-rose-500/30 ${
                tomatoIcons.visible === 0 ? 'opacity-40' : ''
              }`}
              aria-hidden
            >
              <svg width="18" height="18" viewBox="0 0 24 24" role="img" aria-hidden="true">
                <circle cx="12" cy="13" r="7" fill="#EF4444" />
                <path
                  d="M7 9c1-2 3-3 5-3 2 0 4 1 5 3"
                  stroke="#B91C1C"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M12 5c.9 0 1.7.3 2.3.9-.4.2-.8.5-1.1.9-.4-.5-.8-.8-1.2-.8-.7 0-1.4.5-2 1.6-.4-.4-.8-.7-1.2-.9.8-1.1 2-1.7 3.2-1.7Z"
                  fill="#22C55E"
                />
              </svg>
            </span>
          ))}
          {tomatoIcons.overflow > 0 && (
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-200">
              +{tomatoIcons.overflow} more
            </span>
          )}
        </div>
        {totals.pomodoros === 0 && (
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">No pomodoros yet.</p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-gray-600 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
        <span className="font-semibold text-gray-900 dark:text-white">{meta.activeUsers}</span> {usersLabel}
      </div>

      {error && (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-300">
          Unable to refresh totals right now.
        </p>
      )}
    </div>
  )
}
