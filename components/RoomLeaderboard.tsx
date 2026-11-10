'use client'

import { Trophy } from 'lucide-react'
import { LeaderboardPodium, LeaderboardTable } from '@/components/LeaderboardStandings'
import { useI18n } from '@/components/I18nProvider'
import { communityCopy } from '@/lib/i18n/community'
import { leaderboardCopy } from '@/lib/i18n/leaderboard'
import type { RoomStats } from '@/types'

export default function RoomLeaderboard({ stats, currentUserId }: { stats: RoomStats | null; currentUserId?: string }) {
  const { language } = useI18n()
  const copy = leaderboardCopy[language]
  const community = communityCopy[language]
  const users = stats?.topUsers ?? []

  return (
    <section className="community-panel room-leaderboard" aria-labelledby="room-leaderboard-title">
      <header className="community-panel-heading">
        <div>
          <h2 id="room-leaderboard-title"><Trophy size={18} aria-hidden="true" />{copy.roomRanking}</h2>
          <p>{copy.roomRankingHint}</p>
        </div>
      </header>
      {users.length > 0 ? <>
        <LeaderboardPodium users={users} currentUserId={currentUserId} />
        <LeaderboardTable users={users} currentUserId={currentUserId} maxMinutes={users[0].totalMinutes || 1} caption={`${copy.roomRanking} — ${copy.roomRankingHint}`} />
      </> : <p className="community-muted" role="status">{stats ? community.noData : community.statsUnavailable}</p>}
    </section>
  )
}
