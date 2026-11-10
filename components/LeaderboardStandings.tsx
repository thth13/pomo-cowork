'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Crown, Trophy } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { leaderboardCopy } from '@/lib/i18n/leaderboard'
import { ranksCopy } from '@/lib/i18n/ranks'
import { getRank } from '@/lib/ranks'
import { userProfileHref } from '@/lib/userProfile'
import '@/app/leaderboard/leaderboard.css'

export interface LeaderboardUser {
  id: string
  username: string
  avatarUrl?: string
  experience: number
  isPro: boolean
  totalPomodoros: number
  totalMinutes: number
  rank: number
}

export const formatLeaderboardTime = (minutes: number) => `${Math.floor(minutes / 60)}:${String(Math.floor(minutes % 60)).padStart(2, '0')}`

export function Avatar({ user, large = false }: { user: LeaderboardUser; large?: boolean }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [user.avatarUrl])
  return (
    <span className={`lb-avatar${large ? ' lb-avatar-large' : ''}`} aria-hidden="true">
      {user.avatarUrl && !failed
        ? <Image src={user.avatarUrl} alt="" width={80} height={80} onError={() => setFailed(true)} />
        : user.username.charAt(0).toUpperCase()}
    </span>
  )
}

export function PremiumBadge() {
  const { t } = useI18n()
  return <span className="workspace-account-pro lb-premium" aria-label={t.leaderboard.premiumUser}><Crown size={12} aria-hidden="true" />Pro</span>
}

interface StandingsProps {
  users: LeaderboardUser[]
  currentUserId?: string
}

export function LeaderboardPodium({ users, currentUserId }: StandingsProps) {
  const { language, t } = useI18n()
  const copy = leaderboardCopy[language]
  return (
    <ol className="lb-podium">
      {users.slice(0, 3).map(person => <li key={person.id} className={`lb-leader lb-leader-${person.rank}`}>
        <Link href={userProfileHref(person)} className="lb-leader-link">
          <span className="lb-leader-rank">{String(person.rank).padStart(2, '0')}</span>
          <Avatar user={person} large />
          <div className="lb-leader-info"><span className="lb-leader-label">{person.rank === 1 ? <Trophy size={14} aria-hidden="true" /> : null}{copy.rank} {person.rank}{person.id === currentUserId && <span className="lb-you">{t.leaderboard.you}</span>}</span><h3>{person.username}{person.isPro && <PremiumBadge />}</h3><p><strong>{formatLeaderboardTime(person.totalMinutes)}</strong><span>{copy.timeUnit}</span></p></div>
          <ArrowUpRight className="lb-leader-arrow" size={18} aria-hidden="true" />
        </Link>
      </li>)}
    </ol>
  )
}

export function LeaderboardTable({ users, currentUserId, maxMinutes, caption }: StandingsProps & { maxMinutes: number; caption: string }) {
  const { language, t } = useI18n()
  const copy = leaderboardCopy[language]
  const number = (value: number) => value.toLocaleString(language === 'es' ? 'es-ES' : 'en-US')
  return (
    <div className="lb-table-wrap">
      <table className="lb-table">
        <caption className="sr-only">{caption}</caption>
        <thead><tr><th scope="col">{copy.rank}</th><th scope="col">{copy.participant}</th><th scope="col">{ranksCopy[language].rank}</th><th scope="col">{t.leaderboard.focus} <span>({copy.timeUnit})</span></th><th scope="col">{t.leaderboard.pomos}</th></tr></thead>
        <tbody>{users.map(person => {
          const userRank = getRank(person.experience)
          return <tr key={person.id} className={person.id === currentUserId ? 'lb-row-self' : undefined}>
          <td><span className={`lb-position${person.rank <= 3 ? ' lb-position-top' : ''}`}>{String(person.rank).padStart(2, '0')}</span></td>
          <th scope="row"><Link href={userProfileHref(person)} className="lb-person"><Avatar user={person} /><span className="lb-person-name">{person.username}{person.isPro && <PremiumBadge />}{person.id === currentUserId && <span className="lb-you">{t.leaderboard.you}</span>}</span></Link></th>
          <td><span className="lb-user-rank"><span className="lb-rank-mark" style={{ background: userRank.ring }} aria-hidden="true" />{t.todayContribution.ranks[userRank.id]}</span></td>
          <td><strong className="lb-time">{formatLeaderboardTime(person.totalMinutes)}</strong><span className="lb-time-track" aria-hidden="true"><span style={{ width: `${Math.max(1, person.totalMinutes / maxMinutes * 100)}%` }} /></span></td>
          <td className="lb-pomos">{number(person.totalPomodoros)}</td>
        </tr>})}</tbody>
      </table>
    </div>
  )
}
