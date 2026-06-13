'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Check, Flame, HelpCircle, Medal, Pencil, Plus, Target, Trash2, Users } from 'lucide-react'
import { getRankProgress } from '@/lib/ranks'
import { useAuthStore } from '@/store/useAuthStore'
import { useI18n } from '@/components/I18nProvider'
import AuthModal from '@/components/AuthModal'

interface ContributionTotals {
  pomodoros: number
  focusMinutes: number
}

interface ContributionMeta {
  activeUsers: number
}

interface TodayStatsResponse {
  community: {
    pomodoros: number
    focusMinutes: number
    activeUsers: number
  }
  currentUser: {
    rank: number | null
    pomodoros: number
    focusMinutes: number
  } | null
}

const DEFAULT_DAY_GOAL = 4
const DEFAULT_TIME_GOAL = 2
const TODAY_STATS_REFRESH_MS = 5 * 60 * 1000
type DayGoalType = 'pomodoros' | 'time'

const emptyTotals: ContributionTotals = {
  pomodoros: 0,
  focusMinutes: 0,
}

export default function TodayContribution() {
  const { language, t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const [totals, setTotals] = useState<ContributionTotals>(emptyTotals)
  const [meta, setMeta] = useState<ContributionMeta>({ activeUsers: 0 })
  const [todayRank, setTodayRank] = useState<number | null>(null)
  const [todayPomodoros, setTodayPomodoros] = useState(0)
  const [todayFocusMinutes, setTodayFocusMinutes] = useState(0)
  const [dayGoal, setDayGoal] = useState<number | null>(null)
  const [dayGoalType, setDayGoalType] = useState<DayGoalType>('pomodoros')
  const [dayGoalTypeDraft, setDayGoalTypeDraft] = useState<DayGoalType>('pomodoros')
  const [dayGoalDraft, setDayGoalDraft] = useState(String(DEFAULT_DAY_GOAL))
  const [editingDayGoal, setEditingDayGoal] = useState(false)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [rankLoading, setRankLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const rankProgress = useMemo(() => getRankProgress(user?.experience ?? 0), [user?.experience])
  const streak = user?.currentStreak ?? 0
  const isUnregistered = !user || Boolean(user.isAnonymous)
  const dayGoalStorageKey = `day_goal_${user?.id ?? 'guest'}`
  const rankName = t.todayContribution.ranks[rankProgress.rank.id]
  const nextRankName = rankProgress.nextRank
    ? t.todayContribution.ranks[rankProgress.nextRank.id]
    : null

  useEffect(() => {
    const storedValue = localStorage.getItem(dayGoalStorageKey)
    if (!storedValue) {
      setDayGoal(null)
      setDayGoalType('pomodoros')
      setDayGoalTypeDraft('pomodoros')
      setDayGoalDraft(String(DEFAULT_DAY_GOAL))
      return
    }

    try {
      const storedGoal = JSON.parse(storedValue) as { type?: DayGoalType; value?: number }
      if (
        (storedGoal.type === 'pomodoros' || storedGoal.type === 'time')
        && typeof storedGoal.value === 'number'
        && storedGoal.value > 0
      ) {
        setDayGoal(storedGoal.value)
        setDayGoalType(storedGoal.type)
        setDayGoalTypeDraft(storedGoal.type)
        setDayGoalDraft(String(storedGoal.value))
        return
      }
    } catch {
      const legacyGoal = Number.parseInt(storedValue, 10)
      if (Number.isFinite(legacyGoal) && legacyGoal > 0) {
        setDayGoal(legacyGoal)
        setDayGoalType('pomodoros')
        setDayGoalTypeDraft('pomodoros')
        setDayGoalDraft(String(legacyGoal))
        return
      }
    }

    setDayGoal(null)
  }, [dayGoalStorageKey])

  useEffect(() => {
    let active = true

    const fetchTodayStats = async () => {
      try {
        setError(false)
        const headers: Record<string, string> = {}
        if (token) {
          headers.Authorization = `Bearer ${token}`
        }

        const dayStart = new Date()
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(dayStart)
        dayEnd.setDate(dayEnd.getDate() + 1)

        const url = new URL('/api/stats/today', window.location.origin)
        url.searchParams.set('dayStart', dayStart.toISOString())
        url.searchParams.set('dayEnd', dayEnd.toISOString())

        const response = await fetch(url.toString(), { headers })
        if (!response.ok) {
          throw new Error('Failed to load sessions')
        }

        const data = (await response.json()) as TodayStatsResponse
        if (!active) return

        setTotals({
          pomodoros: data.community.pomodoros,
          focusMinutes: data.community.focusMinutes,
        })
        setMeta({ activeUsers: data.community.activeUsers })
        setTodayRank(data.currentUser?.rank ?? null)
        setTodayPomodoros(data.currentUser?.pomodoros ?? 0)
        setTodayFocusMinutes(data.currentUser?.focusMinutes ?? 0)
      } catch (fetchError) {
        if (active) {
          setError(true)
          setTodayRank(null)
        }
      } finally {
        if (active) {
          setLoading(false)
          setRankLoading(false)
        }
      }
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchTodayStats()
      }
    }

    setLoading(true)
    setRankLoading(true)
    void fetchTodayStats()
    const interval = window.setInterval(refreshWhenVisible, TODAY_STATS_REFRESH_MS)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    window.addEventListener('session-completed', refreshWhenVisible)

    return () => {
      active = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener('session-completed', refreshWhenVisible)
    }
  }, [token])

  const formattedPomodoros = useMemo(() => {
    return totals.pomodoros.toLocaleString(language === 'es' ? 'es-ES' : 'en-US')
  }, [language, totals.pomodoros])

  const formattedHours = useMemo(() => {
    const hours = Math.round((totals.focusMinutes / 60) * 10) / 10
    const fractionDigits = hours > 0 && hours < 10 ? 1 : 0
    return hours.toLocaleString(language === 'es' ? 'es-ES' : 'en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 1,
    })
  }, [language, totals.focusMinutes])

  const dayGoalCurrentValue = dayGoalType === 'time'
    ? todayFocusMinutes / 60
    : todayPomodoros
  const dayGoalProgress = dayGoal
    ? Math.min(100, Math.round((dayGoalCurrentValue / dayGoal) * 100))
    : 0
  const isDayGoalComplete = dayGoal !== null && dayGoalCurrentValue >= dayGoal
  const formattedTodayFocusHours = (Math.round((todayFocusMinutes / 60) * 10) / 10).toLocaleString(language === 'es' ? 'es-ES' : 'en-US', {
    maximumFractionDigits: 1,
  })

  const saveDayGoal = () => {
    const fallbackGoal = dayGoalTypeDraft === 'time' ? DEFAULT_TIME_GOAL : DEFAULT_DAY_GOAL
    const parsedGoal = Number.parseFloat(dayGoalDraft)
    const nextGoal = dayGoalTypeDraft === 'time'
      ? Math.min(24, Math.max(0.5, parsedGoal || fallbackGoal))
      : Math.min(99, Math.max(1, Math.round(parsedGoal || fallbackGoal)))

    setDayGoal(nextGoal)
    setDayGoalType(dayGoalTypeDraft)
    setDayGoalDraft(String(nextGoal))
    setEditingDayGoal(false)
    localStorage.setItem(dayGoalStorageKey, JSON.stringify({
      type: dayGoalTypeDraft,
      value: nextGoal,
    }))
  }

  const removeDayGoal = () => {
    setDayGoal(null)
    setDayGoalType('pomodoros')
    setDayGoalTypeDraft('pomodoros')
    setDayGoalDraft(String(DEFAULT_DAY_GOAL))
    setEditingDayGoal(false)
    localStorage.removeItem(dayGoalStorageKey)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.todayContribution.yourProgress}</h2>
      </div>

      <div className="p-5">
        <h2
          className="truncate bg-clip-text text-lg font-extrabold uppercase tracking-tight text-transparent"
          style={{
            backgroundImage: rankProgress.rank.ring,
            WebkitTextFillColor: 'transparent',
          }}
        >
          {rankName}
        </h2>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold">
            <p>
              <span
                style={{ color: rankProgress.rank.color }}
              >
                {rankProgress.current.toLocaleString(language === 'es' ? 'es-ES' : 'en-US')} XP
              </span>
              <span className="text-slate-400 dark:text-slate-500"> / </span>
              <span
                style={{ color: rankProgress.nextRank?.color ?? rankProgress.rank.color }}
              >
                {rankProgress.required.toLocaleString(language === 'es' ? 'es-ES' : 'en-US')} XP
              </span>
            </p>
            <span className="text-slate-500 dark:text-slate-400">{rankProgress.percent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${rankProgress.percent}%`,
                background: rankProgress.rank.ring,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {rankProgress.nextRank
              ? `${rankProgress.remaining.toLocaleString(language === 'es' ? 'es-ES' : 'en-US')} XP ${t.todayContribution.until} ${nextRankName}`
              : t.todayContribution.maximumRankReached}
          </p>
          {isUnregistered && (
            <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="font-semibold text-rose-500 underline decoration-rose-300 underline-offset-2 transition-colors hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300"
              >
                {t.auth.register}
              </button>
              {' '}
              {t.todayContribution.unregisteredDescription}
            </p>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            href="/users"
            className="group/rank-today rounded-xl border border-slate-200 px-3.5 py-3 outline-none transition-all hover:border-amber-300 hover:bg-amber-50/50 focus-visible:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-400/20 dark:border-slate-700 dark:hover:border-amber-700 dark:hover:bg-amber-950/20"
            aria-label={t.todayContribution.openTodayLeaderboard}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Medal className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {rankLoading ? '...' : todayRank ? `#${todayRank}` : '—'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.todayContribution.rankToday}</p>
              </div>
              <ArrowUpRight
                className="h-4 w-4 text-slate-300 transition-all group-hover/rank-today:-translate-y-0.5 group-hover/rank-today:translate-x-0.5 group-hover/rank-today:text-amber-500 group-focus-visible/rank-today:text-amber-500 dark:text-slate-600"
                aria-hidden="true"
              />
            </div>
          </Link>
          <div className="rounded-xl border border-slate-200 px-3.5 py-3 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" fill="currentColor" aria-hidden="true" />
              <span className="text-lg font-bold text-slate-900 dark:text-white">{streak}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.todayContribution.dayStreak}</p>
              <span className="group/streak relative inline-flex">
                <button
                  type="button"
                  aria-describedby="day-streak-tooltip"
                  className="rounded-full text-slate-400 outline-none transition-colors hover:text-orange-500 focus-visible:text-orange-500 dark:text-slate-500"
                >
                  <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span
                  id="day-streak-tooltip"
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 w-52 translate-y-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium leading-5 text-slate-600 opacity-0 shadow-lg transition-all duration-150 group-hover/streak:translate-y-0 group-hover/streak:opacity-100 group-focus-within/streak:translate-y-0 group-focus-within/streak:opacity-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {t.todayContribution.streakTooltip}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`border-t px-5 py-4 transition-colors ${
          isDayGoalComplete
            ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20'
            : 'border-slate-200 dark:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                isDayGoalComplete
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                  : 'text-rose-500'
              }`}
            >
              {isDayGoalComplete ? (
                <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
              ) : (
                <Target className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <div>
              <p
                className={`text-sm font-bold ${
                  isDayGoalComplete
                    ? 'text-emerald-800 dark:text-emerald-300'
                    : 'text-slate-800 dark:text-slate-100'
                }`}
              >
                {isDayGoalComplete ? t.todayContribution.dailyGoalAchieved : t.todayContribution.dayGoal}
              </p>
              <p
                className={`text-xs ${
                  isDayGoalComplete
                    ? 'text-emerald-700/80 dark:text-emerald-400/80'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {dayGoal
                  ? isDayGoalComplete
                    ? dayGoalType === 'time'
                      ? `${formattedTodayFocusHours} ${t.todayContribution.hoursFocused}`
                      : `${todayPomodoros} ${t.todayContribution.pomodorosCompleted}`
                    : dayGoalType === 'time'
                      ? `${formattedTodayFocusHours} / ${dayGoal} ${t.todayContribution.hours}`
                      : `${todayPomodoros} / ${dayGoal} ${t.todayContribution.pomodoros}`
                  : t.todayContribution.noGoalSet}
              </p>
            </div>
          </div>

          {!editingDayGoal && (dayGoal ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEditingDayGoal(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label={t.todayContribution.editDayGoal}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={removeDayGoal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:text-slate-500 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                aria-label={t.todayContribution.removeDayGoal}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingDayGoal(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
              aria-label={t.todayContribution.addDayGoal}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t.todayContribution.setDailyGoal}
            </button>
          ))}
        </div>

        {editingDayGoal && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/70">
            <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {([
                { type: 'pomodoros' as const, label: t.todayContribution.pomodoros },
                { type: 'time' as const, label: t.todayContribution.focusTime },
              ]).map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => {
                    setDayGoalTypeDraft(option.type)
                    setDayGoalDraft(String(
                      option.type === dayGoalType && dayGoal
                        ? dayGoal
                        : option.type === 'time'
                          ? DEFAULT_TIME_GOAL
                          : DEFAULT_DAY_GOAL
                    ))
                  }}
                  className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                    dayGoalTypeDraft === option.type
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={dayGoalDraft}
                  onChange={(event) => {
                    const value = event.target.value
                      .replace(',', '.')
                      .replace(/[^\d.]/g, '')
                      .replace(/(\..*)\./g, '$1')
                      .slice(0, 4)
                    setDayGoalDraft(value)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') saveDayGoal()
                  }}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 pr-20 text-sm font-bold text-slate-900 outline-none focus:border-rose-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  aria-label={dayGoalTypeDraft === 'time' ? t.todayContribution.focusTime : t.todayContribution.dayGoal}
                  autoFocus
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                  {dayGoalTypeDraft === 'time' ? t.todayContribution.hours : t.todayContribution.pomodoros}
                </span>
              </div>
              <button
                type="button"
                onClick={saveDayGoal}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white transition-colors hover:bg-rose-600"
                aria-label={t.todayContribution.saveDayGoal}
              >
                <Check className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {dayGoal && (
          <div
            className={`mt-3 h-1.5 overflow-hidden rounded-full ${
              isDayGoalComplete
                ? 'bg-emerald-200/70 dark:bg-emerald-900/50'
                : 'bg-slate-100 dark:bg-slate-800'
            }`}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${
                isDayGoalComplete ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{ width: `${dayGoalProgress}%` }}
            />
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-600 dark:text-slate-300" aria-hidden="true" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t.todayContribution.communityFocusTotal}</p>
        </div>

        {loading ? (
          <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        ) : (
          <p className="mt-2 pl-6 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {formattedPomodoros} {t.todayContribution.pomodoros}
            <span aria-hidden="true"> · </span>
            {formattedHours}h {t.todayContribution.focused}
            <span aria-hidden="true"> · </span>
            {meta.activeUsers} {t.todayContribution.people}
          </p>
        )}

        {error && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-300">
            {t.todayContribution.unableToRefresh}
          </p>
        )}
      </div>

      <AuthModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        initialMode="register"
      />
    </div>
  )
}
