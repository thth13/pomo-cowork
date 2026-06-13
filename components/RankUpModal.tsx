'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, Trophy, X } from 'lucide-react'
import { RANKS, type RankId } from '@/lib/ranks'

interface RankUpDetails {
  previousRank: RankId
  rank: RankId
  rankName: string
  experience: number
}

const formatExperience = (experience: number) =>
  new Intl.NumberFormat('en-US').format(experience)

export default function RankUpModal() {
  const [rankUp, setRankUp] = useState<RankUpDetails | null>(null)

  useEffect(() => {
    const handleRankUp = (event: Event) => {
      const detail = (event as CustomEvent<RankUpDetails>).detail
      if (detail?.rank) {
        setRankUp(detail)
      }
    }

    window.addEventListener('rank-up', handleRankUp)
    return () => window.removeEventListener('rank-up', handleRankUp)
  }, [])

  useEffect(() => {
    if (!rankUp) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRankUp(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [rankUp])

  const rank = rankUp
    ? RANKS.find(({ id }) => id === rankUp.rank) ?? RANKS[0]
    : null

  return (
    <AnimatePresence>
      {rankUp && rank ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setRankUp(null)
            }
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rank-up-title"
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl dark:bg-slate-900"
            initial={{ opacity: 0, scale: 0.82, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <div
              className="absolute inset-x-0 top-0 h-36 opacity-25 blur-2xl"
              style={{ background: rank.ring }}
            />

            <button
              type="button"
              onClick={() => setRankUp(null)}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 rounded-full bg-white/70 p-2 text-slate-500 transition hover:bg-white hover:text-slate-900 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative px-6 pb-7 pt-9 text-center sm:px-9">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full p-1 shadow-xl" style={{ background: rank.ring }}>
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-slate-900">
                  <Trophy className="h-10 w-10 text-slate-800 dark:text-white" />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                <Sparkles className="h-4 w-4" />
                Rank unlocked
                <Sparkles className="h-4 w-4" />
              </div>

              <h2 id="rank-up-title" className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
                Congratulations!
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                You reached a new rank
              </p>

              <div
                className="mx-auto mt-5 w-fit rounded-full p-[2px]"
                style={{ background: rank.ring }}
              >
                <div className="rounded-full bg-white px-6 py-2 text-lg font-black uppercase tracking-wide text-slate-900 dark:bg-slate-900 dark:text-white">
                  {rankUp.rankName}
                </div>
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
                {formatExperience(rankUp.experience)} XP
              </p>

              <button
                type="button"
                onClick={() => setRankUp(null)}
                className="mt-6 w-full rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[0.99]"
                style={{ background: rank.ring }}
              >
                Continue
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
