'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Flame, HelpCircle, Medal, Users } from 'lucide-react'
import { getRankProgress } from '@/lib/ranks'
import { useAuthStore } from '@/store/useAuthStore'
import { useI18n } from '@/components/I18nProvider'
import AuthModal from '@/components/AuthModal'
import { useTodayStats } from '@/hooks/useTodayStats'

export default function TodayContribution({ isVisible = true }: { isVisible?: boolean }) {
  const { language, t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const { data, isLoading: loading, error } = useTodayStats(isVisible)
  const totals = data?.community ?? { pomodoros: 0, focusMinutes: 0, activeUsers: 0 }
  const meta = totals
  const todayRank = data?.currentUser?.rank ?? null
  const rankLoading = loading
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const rankProgress = useMemo(() => getRankProgress(user?.experience ?? 0), [user?.experience])
  const streak = user?.currentStreak ?? 0
  const isUnregistered = !user || Boolean(user.isAnonymous)
  const rankName = t.todayContribution.ranks[rankProgress.rank.id]
  const nextRankName = rankProgress.nextRank
    ? t.todayContribution.ranks[rankProgress.nextRank.id]
    : null

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
            href="/leaderboard"
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
