import type { CSSProperties, ReactNode } from 'react'
import { getRankProgress } from '@/lib/ranks'

interface RankAvatarFrameProps {
  experience?: number
  thickness?: number
  className?: string
  tooltip?: 'rank' | 'progress'
  tooltipPosition?: 'top' | 'bottom'
  tooltipAlign?: 'center' | 'right'
  unregistered?: boolean
  children: ReactNode
}

const formatExperience = (experience: number) =>
  new Intl.NumberFormat('en-US').format(experience)

export default function RankAvatarFrame({
  experience = 0,
  thickness = 3,
  className = '',
  tooltip,
  tooltipPosition = 'bottom',
  tooltipAlign = 'center',
  unregistered = false,
  children,
}: RankAvatarFrameProps) {
  const normalizedExperience = Math.max(0, experience)
  const progress = getRankProgress(normalizedExperience)
  const { rank, nextRank } = progress
  const ring = unregistered
    ? 'linear-gradient(135deg, #3f3f46 0%, #52525b 50%, #3f3f46 100%)'
    : rank.ring
  const style: CSSProperties = {
    background: ring,
    padding: thickness,
  }
  const tooltipPositionClass = tooltipPosition === 'top'
    ? 'bottom-full mb-3'
    : 'top-full mt-3'
  const tooltipAlignClass = tooltipAlign === 'right'
    ? 'right-0'
    : 'left-1/2 -translate-x-1/2'

  return (
    <div
      className={`group/rank relative rounded-full ${className}`}
      style={style}
      aria-label={unregistered ? 'Unregistered' : `${rank.name} rank`}
    >
      <div className="h-full w-full overflow-hidden rounded-full">
        {children}
      </div>
      {tooltip ? (
        <div
          role="tooltip"
          className={`pointer-events-none absolute z-[70] w-max max-w-[240px] translate-y-1 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-left opacity-0 shadow-xl backdrop-blur-sm transition-all duration-150 group-hover/rank:translate-y-0 group-hover/rank:opacity-100 group-focus-within/rank:translate-y-0 group-focus-within/rank:opacity-100 dark:border-slate-700 dark:bg-slate-900/95 ${tooltipPositionClass} ${tooltipAlignClass}`}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: ring }}
            />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {unregistered ? 'Unregistered' : rank.name}
            </span>
          </div>

          {unregistered ? (
            <p className="mt-1 whitespace-nowrap text-[11px] font-medium text-slate-500 dark:text-slate-400">
              0 XP
            </p>
          ) : tooltip === 'rank' ? (
            <p className="mt-1 whitespace-nowrap text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {formatExperience(normalizedExperience)} XP
            </p>
          ) : nextRank ? (
            <>
              <div className="mt-2 flex items-center justify-between gap-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <span>{formatExperience(progress.current)} XP</span>
                <span>{formatExperience(progress.required)} XP</span>
              </div>
              <div className="mt-1 h-1.5 w-48 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{
                    width: `${progress.percent}%`,
                    background: rank.ring,
                  }}
                />
              </div>
              <p className="mt-1.5 whitespace-nowrap text-[10px] font-medium text-slate-500 dark:text-slate-400">
                {formatExperience(progress.remaining)} XP to {nextRank.name}
              </p>
            </>
          ) : (
            <p className="mt-1 whitespace-nowrap text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Maximum rank - {formatExperience(normalizedExperience)} XP
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
