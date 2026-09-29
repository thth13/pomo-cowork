'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Trophy } from 'lucide-react'
import NotificationToast from '@/components/NotificationToast'
import { useI18n } from '@/components/I18nProvider'
import { RANKS, type RankId } from '@/lib/ranks'
import { ranksCopy } from '@/lib/i18n/ranks'
import { useAuthStore } from '@/store/useAuthStore'

interface RankUpDetails {
  previousRank: RankId
  rank: RankId
  experience: number
}

export default function RankUpToast() {
  const { language, t } = useI18n()
  const userId = useAuthStore((state) => state.user?.id)
  const [queue, setQueue] = useState<RankUpDetails[]>([])
  const seen = useRef(new Set<RankId>())
  const dismiss = useCallback(() => setQueue((items) => items.slice(1)), [])

  useEffect(() => {
    seen.current.clear()
    setQueue([])
    const handleRankUp = (event: Event) => {
      const detail = (event as CustomEvent<RankUpDetails>).detail
      const nextIndex = RANKS.findIndex(({ id }) => id === detail?.rank)
      const previousIndex = RANKS.findIndex(({ id }) => id === detail?.previousRank)
      if (previousIndex < 0 || nextIndex <= previousIndex ||
          !Number.isFinite(detail.experience) || seen.current.has(detail.rank)) return

      seen.current.add(detail.rank)
      setQueue((items) => [...items, detail])
    }
    window.addEventListener('rank-up', handleRankUp)
    return () => window.removeEventListener('rank-up', handleRankUp)
  }, [userId])

  const current = queue[0]
  const rank = RANKS.find(({ id }) => id === current?.rank)
  const copy = ranksCopy[language]

  return (
    <NotificationToast
      message={current ? t.todayContribution.ranks[current.rank] : ''}
      isVisible={!!current}
      onClose={dismiss}
      type="success"
      variant="rank-up"
      notificationKey={current?.rank}
      duration={8000}
      title={copy.unlocked}
      description={current ? `${new Intl.NumberFormat(language).format(current.experience)} XP · ${copy.keepGoing}` : ''}
      accent={rank?.color}
      icon={<Trophy aria-hidden="true" size={26} strokeWidth={1.8} />}
    />
  )
}
