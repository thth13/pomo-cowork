'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faClock,
  faCrown,
  faFire,
  faMagnifyingGlass,
  faRotateRight,
  faTrophy,
  faUsers,
  faCalendarDay,
  faCalendarWeek,
  faCalendarDays,
  faCalendar
} from '@fortawesome/free-solid-svg-icons'
import Navbar from '@/components/Navbar'
import { useAuthStore } from '@/store/useAuthStore'

type LeaderboardPeriod = 'day' | 'week' | 'month' | 'year'

interface LeaderboardUser {
  id: string
  username: string
  avatarUrl?: string
  totalHours: number
  totalPomodoros: number
  totalMinutes: number
  rank: number
}

interface PeriodTotals {
  totalMinutes: number
  totalHours: number
  totalPomodoros: number
}

interface LeaderboardResponse {
  period: LeaderboardPeriod
  periodLabel: string
  leaderboard: LeaderboardUser[]
  currentUser: LeaderboardUser | null
  periodTotals: PeriodTotals
}

const PERIODS: { value: LeaderboardPeriod; label: string; icon: any }[] = [
  { value: 'day', label: 'Today', icon: faCalendarDay },
  { value: 'week', label: 'Week', icon: faCalendarWeek },
  { value: 'month', label: 'Month', icon: faCalendarDays },
  { value: 'year', label: 'Year', icon: faCalendar },
]

const RANK_META = {
  1: {
    platform: 'bg-amber-400',
    platformText: 'text-amber-950',
    glow: '[box-shadow:0_0_0_4px_rgba(251,191,36,0.25)]',
    badge: 'bg-amber-400 text-amber-950',
    bar: 'bg-amber-400',
    ringColor: 'ring-amber-300',
  },
  2: {
    platform: 'bg-slate-300 dark:bg-slate-500',
    platformText: 'text-slate-800 dark:text-slate-100',
    glow: '[box-shadow:0_0_0_4px_rgba(148,163,184,0.25)]',
    badge: 'bg-slate-300 text-slate-800 dark:bg-slate-500 dark:text-slate-100',
    bar: 'bg-slate-400',
    ringColor: 'ring-slate-300',
  },
  3: {
    platform: 'bg-orange-400',
    platformText: 'text-orange-950',
    glow: '[box-shadow:0_0_0_4px_rgba(249,115,22,0.22)]',
    badge: 'bg-orange-400 text-orange-950',
    bar: 'bg-orange-400',
    ringColor: 'ring-orange-300',
  },
} as const

const fmt = (hours: number) => {
  if (!Number.isFinite(hours)) return '0'
  if (Number.isInteger(hours)) return String(hours)
  return hours.toFixed(1)
}

function Avatar({
  user,
  size,
  textSize,
}: {
  user: Pick<LeaderboardUser, 'username' | 'avatarUrl'>
  size: string
  textSize: string
}) {
  if (user.avatarUrl) {
    return (
      <Image
        src={user.avatarUrl}
        alt={user.username}
        width={96}
        height={96}
        className={`${size} rounded-full object-cover`}
      />
    )
  }

  return (
    <div
      className={`${size} flex items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-emerald-400 font-black text-white ${textSize}`}
    >
      {user.username.charAt(0).toUpperCase()}
    </div>
  )
}

function RowSkeleton() {
  return (
    <div className="animate-pulse px-6 py-4">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-32 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-2.5 w-full max-w-xs rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const router = useRouter()
  const { user: currentUser, token } = useAuthStore()

  const [period, setPeriod] = useState<LeaderboardPeriod>('month')
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardUser | null>(null)
  const [periodTotals, setPeriodTotals] = useState<PeriodTotals | null>(null)
  const [periodLabel, setPeriodLabel] = useState('This month')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)

    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

    fetch(`/api/stats/leaderboard?period=${period}`, { headers, signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Failed')
        return res.json() as Promise<LeaderboardResponse>
      })
      .then((data) => {
        const active = (data.leaderboard ?? []).filter((u) => u.totalMinutes > 0)
        setLeaderboard(active)
        setCurrentUserRank(data.currentUser?.totalMinutes ? data.currentUser : null)
        setPeriodTotals(data.periodTotals)
        setPeriodLabel(data.periodLabel)
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return
        console.error(err)
        setError('Failed to load leaderboard')
        setLeaderboard([])
        setCurrentUserRank(null)
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false)
      })

    return () => ctrl.abort()
  }, [period, token])

  const maxMinutes = leaderboard[0]?.totalMinutes || 1
  const filtered = leaderboard.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] pb-24 font-sans tracking-tight">
        {/* Subtle decorative background gradient */}
        <div className="absolute inset-x-0 top-0 h-[600px] bg-gradient-to-b from-sky-500/5 via-violet-500/5 to-transparent pointer-events-none dark:from-sky-500/10 dark:via-violet-500/10" />

        <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

          {/* ─── HEADER ─────────────────────────────────────────── */}
          <div className="mb-12 flex flex-col items-center text-center">
            <h1 className="mb-8 text-4xl font-black text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Leaderboard
            </h1>

            {/* Period segmented control */}
            <div className="inline-flex items-center rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900/80 dark:ring-white/10 backdrop-blur-xl transition-all">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriod(p.value)}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200 ${
                    p.value === period
                      ? 'bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
                  }`}
                >
                  <FontAwesomeIcon icon={p.icon} className={p.value === period ? 'opacity-100' : 'opacity-60'} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* ─── STATS STRIP ────────────────────────────────────── */}
          <div className="mb-10 grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            {(
              [
                {
                  label: 'Active Users',
                  value: loading ? '—' : String(leaderboard.length),
                  sub: `in ${periodLabel.toLowerCase()}`,
                  icon: faUsers,
                  accent: 'text-sky-500',
                  bg: 'bg-sky-50 dark:bg-sky-500/10',
                  border: 'ring-sky-100 dark:ring-sky-500/20',
                },
                {
                  label: 'Focus Time',
                  value: loading ? '—' : `${fmt((periodTotals?.totalMinutes ?? 0) / 60)}h`,
                  sub: 'across all users',
                  icon: faClock,
                  accent: 'text-violet-500',
                  bg: 'bg-violet-50 dark:bg-violet-500/10',
                  border: 'ring-violet-100 dark:ring-violet-500/20',
                },
                {
                  label: 'Pomodoros',
                  value: loading ? '—' : String(periodTotals?.totalPomodoros ?? 0),
                  sub: 'completed sessions',
                  icon: faFire,
                  accent: 'text-rose-500',
                  bg: 'bg-rose-50 dark:bg-rose-500/10',
                  border: 'ring-rose-100 dark:ring-rose-500/20',
                },
              ] as const
            ).map((stat) => (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-[24px] bg-white/80 p-6 flex items-center gap-5 ring-1 ring-slate-900/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] dark:bg-slate-900/60 dark:ring-white/10 dark:shadow-none"
              >
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${stat.bg} ${stat.accent}`}
                >
                  <FontAwesomeIcon icon={stat.icon} className="text-xl" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{stat.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ─── LOADING ────────────────────────────────────────── */}
          {loading ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
                <div className="overflow-hidden rounded-[32px] bg-white/60 ring-1 ring-slate-900/5 dark:bg-slate-900/40 dark:ring-white/10">
                  {[...Array(5)].map((_, i) => (
                    <RowSkeleton key={i} />
                  ))}
                </div>
                <div className="h-[300px] animate-pulse rounded-[32px] bg-white/60 ring-1 ring-slate-900/5 dark:bg-slate-900/40 dark:ring-white/10" />
            </div>
          ) : error ? (
            /* ─── ERROR ─────────────────────────────────────────── */
            <div className="flex flex-col items-center justify-center gap-5 rounded-[32px] bg-white/80 py-20 text-center ring-1 ring-rose-200 shadow-sm backdrop-blur-xl dark:bg-slate-900/60 dark:ring-rose-500/30">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-500/10">
                <FontAwesomeIcon icon={faRotateRight} className="text-3xl" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Leaderboard Unavailable</h3>
                <p className="mt-2 text-slate-500 dark:text-slate-400 text-lg">There was an issue fetching the ranking.</p>
              </div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 dark:bg-white dark:text-slate-900"
              >
                <FontAwesomeIcon icon={faRotateRight} />
                Try Again
              </button>
            </div>
          ) : leaderboard.length === 0 ? (
            /* ─── EMPTY ─────────────────────────────────────────── */
            <div className="flex flex-col items-center justify-center gap-5 rounded-[32px] bg-white/80 py-28 text-center ring-1 ring-slate-900/5 shadow-sm backdrop-blur-xl dark:bg-slate-900/60 dark:ring-white/10">
              <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-amber-50 text-4xl text-amber-500 shadow-inner dark:bg-amber-500/10">
                <FontAwesomeIcon icon={faTrophy} />
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">Nobody here yet!</h3>
                <p className="mt-3 max-w-md mx-auto text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
                  Be the very first to complete a focus session and claim the highest rank for {periodLabel.toLowerCase()}.
                </p>
              </div>
            </div>
          ) : (
            /* ─── MAIN CONTENT ──────────────────────────────────── */
            <div className="space-y-8 lg:space-y-12">

              {/* ── LOWER SECTION ───────────────────────────────────── */}
              <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
                
                {/* Full List Panel */}
                <div className="overflow-hidden rounded-[32px] bg-white border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.04)] dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-none">
                  {/* Header + search */}
                  <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:p-8 dark:border-slate-800/80 sm:flex-row sm:items-center sm:justify-between bg-slate-50/30 dark:bg-slate-800/20">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        Full Ranking
                        <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {filtered.length}
                        </span>
                      </h2>
                    </div>
                    <div className="relative w-full sm:max-w-xs group">
                      <FontAwesomeIcon
                        icon={faMagnifyingGlass}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors"
                      />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search users..."
                        className="w-full rounded-2xl border-2 border-slate-100 bg-white py-3 pl-11 pr-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {filtered.length === 0 ? (
                    <div className="p-16 text-center">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-400 dark:bg-slate-800">
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                      </div>
                      <h4 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">No matches found</h4>
                      <p className="mt-2 text-sm text-slate-500">
                        Could not find any user matching &ldquo;<strong className="text-slate-700 dark:text-slate-300">{search}</strong>&rdquo;
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-2 sm:p-4">
                      {filtered.map((user) => {
                        const isMe = currentUser?.id === user.id
                        const isTop = user.rank <= 3
                        const meta = isTop ? RANK_META[user.rank as 1 | 2 | 3] : null
                        const pct = Math.max(2, Math.round((user.totalMinutes / maxMinutes) * 100))

                        return (
                          <div
                            key={user.id}
                            onClick={() => router.push(`/user/${user.id}`)}
                            role="button"
                            className={`group flex cursor-pointer items-center gap-4 sm:gap-5 rounded-2xl p-4 transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 ${isMe ? 'bg-sky-50/50 ring-1 ring-sky-200/60 shadow-sm dark:bg-sky-500/10 dark:ring-sky-500/20' : ''}`}
                          >
                            <div
                              className={`flex h-[42px] w-[42px] sm:h-[48px] sm:w-[48px] shrink-0 items-center justify-center rounded-2xl text-lg font-black shadow-sm transition-transform group-hover:scale-105 ${
                                meta
                                  ? `${meta.platform} ${meta.platformText}`
                                  : isMe ? 'bg-sky-500 text-white dark:bg-sky-500' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {user.rank}
                            </div>

                            <div className="shrink-0 relative">
                              <Avatar user={user} size="h-[42px] w-[42px] sm:h-[48px] sm:w-[48px]" textSize="text-lg" />
                              {isMe && (
                                <div className="absolute -bottom-1 -right-1 rounded-full bg-sky-500 p-1 text-[8px] text-white border-2 border-white dark:border-slate-900 shadow-sm">
                                  <FontAwesomeIcon icon={faUsers} />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 truncate">
                                  <p className="truncate text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                    {user.username}
                                  </p>
                                  {isMe && (
                                    <span className="shrink-0 rounded-lg bg-sky-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                                      You
                                    </span>
                                  )}
                                </div>
                                <span className="shrink-0 text-sm font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                  {fmt(user.totalHours)}<span className="text-xs text-slate-400 font-bold ml-0.5 mr-1.5">h</span>
                                  <span className="text-slate-200 dark:text-slate-700 font-normal mr-1.5">|</span>
                                  {user.totalPomodoros} <span className="text-xs">🍅</span>
                                </span>
                              </div>
                              <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100/80 dark:bg-slate-800">
                                <div
                                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${meta ? meta.bar : isMe ? 'bg-sky-500' : 'bg-slate-800 dark:bg-slate-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <aside className="space-y-6 lg:sticky lg:top-8">
                  <div className="overflow-hidden rounded-[32px] bg-white border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.04)] dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-none">
                    <div className="bg-slate-50/50 border-b border-slate-100 px-7 py-5 dark:bg-slate-800/20 dark:border-slate-800/80">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Your Status
                      </h3>
                    </div>
                    {currentUserRank && currentUser ? (
                      <div
                        role="button"
                        onClick={() => router.push('/profile')}
                        className="group p-7 cursor-pointer hover:bg-slate-50/30 transition-colors dark:hover:bg-slate-800/30"
                      >
                        <div className="mb-6 flex items-center gap-5">
                          <div className="relative">
                            <Avatar
                              user={{ username: currentUser.username, avatarUrl: currentUser.avatarUrl }}
                              size="h-16 w-16"
                              textSize="text-2xl"
                            />
                            <div className="absolute -bottom-2 -right-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl px-2 py-0.5 text-xs font-black shadow-sm border-2 border-white dark:border-slate-900">
                              #{currentUserRank.rank}
                            </div>
                          </div>
                          <div>
                            <p className="text-xl font-black text-slate-900 dark:text-white group-hover:text-sky-600 transition-colors">
                              {currentUser.username}
                            </p>
                            <p className="text-sm font-semibold text-sky-500 mt-1">
                              Top {Math.max(1, Math.round((currentUserRank.rank / leaderboard.length) * 100))}%
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 dark:bg-slate-800/50 dark:ring-slate-700/50">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Focus</p>
                            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                              {fmt(currentUserRank.totalHours)}<span className="text-sm text-slate-400 ml-0.5 font-bold">h</span>
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 dark:bg-slate-800/50 dark:ring-slate-700/50">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pomos</p>
                            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                              {currentUserRank.totalPomodoros}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50/50 p-4 dark:bg-slate-800/20">
                          <div className="mb-2 flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-500">Progress to #1</span>
                            <span className="text-slate-900 dark:text-white">
                              {Math.round((currentUserRank.totalMinutes / maxMinutes) * 100)}%
                            </span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-700">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-500 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] transition-all duration-1000"
                              style={{
                                width: `${Math.round((currentUserRank.totalMinutes / maxMinutes) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-100 dark:bg-slate-800/50 dark:ring-slate-700">
                          <FontAwesomeIcon icon={faUsers} className="text-xl" />
                        </div>
                        <p className="text-sm font-bold leading-relaxed text-slate-600 dark:text-slate-300">
                          {currentUser
                            ? `Log a session to appear on the ${periodLabel.toLowerCase()} board.`
                            : 'Log in and focus to see your position.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Rules Card */}
                  <div className="overflow-hidden rounded-[32px] bg-white border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.04)] dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-none">
                    <div className="bg-slate-50/50 border-b border-slate-100 px-7 py-5 dark:bg-slate-800/20 dark:border-slate-800/80">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        How It Works
                      </h3>
                    </div>
                    <div className="p-7">
                      <ul className="space-y-5 text-sm">
                        <li className="flex gap-4">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-500/10">
                            <FontAwesomeIcon icon={faCrown} className="text-[10px]" />
                          </div>
                          <div>
                            <strong className="block text-slate-900 dark:text-white mb-1 font-bold">Primary Metric</strong>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Ranked strictly by effective tracked minutes.</p>
                          </div>
                        </li>
                        <li className="flex gap-4">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-500 dark:bg-sky-500/10">
                            <FontAwesomeIcon icon={faClock} className="text-xs" />
                          </div>
                          <div>
                            <strong className="block text-slate-900 dark:text-white mb-1 font-bold">Tracking Periods</strong>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Day, Week (Mon-Sun), Month, and Year.</p>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                </aside>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
