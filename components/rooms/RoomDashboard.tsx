'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'
import { Check, Clock, Flame, Pencil, Play, Plus, Share2, Sprout, Target, Trophy, Users } from 'lucide-react'
import CommunityDialog from '@/components/CommunityDialog'
import GuestAvatar from '@/components/GuestAvatar'
import ParticipantName, { getParticipantIdentity } from '@/components/ParticipantName'
import { useI18n } from '@/components/I18nProvider'
import { roomEngagementCopy } from '@/lib/i18n/roomEngagement'
import { subscribeTimerChanges } from '@/lib/timerEvents'
import { userProfileHref } from '@/lib/userProfile'
import { useAuthStore } from '@/store/useAuthStore'
import type { RoomEngagementStats, RoomLeaderboardEntry, RoomLeaderboardPeriod } from '@/types/roomEngagement'
import styles from './RoomDashboard.module.css'

interface RoomDashboardProps {
  roomId: string
  isOwner: boolean
  isMember: boolean
  onStartFocus: () => void
  onShare: () => void
  canStartFocus?: boolean
  membershipVersion?: number
  liveActivity?: ReactNode
}

class RoomProgressError extends Error {
  constructor(public status: number) { super('Unable to load room progress') }
}

export default function RoomDashboard({ roomId, isOwner, isMember, onStartFocus, onShare, canStartFocus = true, membershipVersion = 0, liveActivity }: RoomDashboardProps) {
  const { language, t } = useI18n()
  const copy = roomEngagementCopy[language]
  const locale = language === 'es' ? 'es-ES' : 'en-US'
  const { user, token, isLoading: authLoading } = useAuthStore()
  const [period, setPeriod] = useState<RoomLeaderboardPeriod>('today')
  const [editorOpen, setEditorOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [draft, setDraft] = useState({ title: '', target: '50' })
  const [initialDraft, setInitialDraft] = useState({ title: '', target: '50' })
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; target?: string; form?: string }>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [conflicted, setConflicted] = useState(false)
  const savingRef = useRef(false)
  const composingRef = useRef(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const targetRef = useRef<HTMLInputElement>(null)
  const rankingRef = useRef<HTMLOListElement>(null)
  const controllers = useRef(new Set<AbortController>())
  const mounted = useRef(true)
  const activeToken = useRef(token)
  activeToken.current = token

  const key = authLoading ? null : [`/api/rooms/${encodeURIComponent(roomId)}/stats`, token, user?.id] as const
  const { data, error, isLoading, isValidating, mutate } = useSWR<RoomEngagementStats, RoomProgressError>(key,
    async ([url, auth]: readonly [string, string | null, string | undefined]) => {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 20_000)
      try {
        const response = await fetch(url, {
          headers: auth ? { Authorization: `Bearer ${auth}` } : undefined,
          cache: 'no-store', signal: controller.signal,
        })
        if (!response.ok) throw new RoomProgressError(response.status)
        return await response.json() as RoomEngagementStats
      } finally {
        window.clearTimeout(timeout)
      }
    }, {
      refreshInterval: 60_000, refreshWhenHidden: false, refreshWhenOffline: false,
      revalidateOnFocus: true, revalidateOnReconnect: true, keepPreviousData: false,
      shouldRetryOnError: false,
    })

  const refresh = useCallback(() => {
    if (document.visibilityState === 'visible') void mutate()
  }, [mutate])

  useEffect(() => {
    if (membershipVersion > 0) void mutate()
  }, [membershipVersion, mutate])

  useEffect(() => {
    mounted.current = true
    const pending = controllers.current
    return () => { mounted.current = false; pending.forEach(controller => controller.abort()); pending.clear() }
  }, [])

  useEffect(() => {
    window.addEventListener('session-completed', refresh)
    window.addEventListener('pomo:timer-changed', refresh)
    document.addEventListener('visibilitychange', refresh)
    const unsubscribe = user?.id ? subscribeTimerChanges(user.id, refresh) : undefined
    return () => {
      window.removeEventListener('session-completed', refresh)
      window.removeEventListener('pomo:timer-changed', refresh)
      document.removeEventListener('visibilitychange', refresh)
      unsubscribe?.()
    }
  }, [refresh, user?.id])

  useEffect(() => {
    if (!data?.dayEndsAt) return
    const delay = new Date(data.dayEndsAt).getTime() - Date.now() + 1000
    if (delay <= 0 || delay > 86_401_000) return
    const timeout = window.setTimeout(refresh, delay)
    return () => window.clearTimeout(timeout)
  }, [data?.dayEndsAt, refresh])

  useEffect(() => {
    setEditorOpen(false)
    setDiscardOpen(false)
    setSaved(false)
  }, [roomId, token])

  useEffect(() => {
    if (!saved) return
    const timeout = window.setTimeout(() => setSaved(false), 6000)
    return () => window.clearTimeout(timeout)
  }, [saved])

  const dirty = editorOpen && (draft.title !== initialDraft.title || draft.target !== initialDraft.target)
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    if (!editorOpen || discardOpen) return
    const frame = window.requestAnimationFrame(() => nameRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [editorOpen, discardOpen])

  const accessChanged = error && [401, 403, 404].includes(error.status)
  const stats = accessChanged ? undefined : data
  const challenge = stats?.challenge
  const personal = stats?.personal
  const ranking = stats?.leaderboards[period]
  const currentUserOutsideList = ranking?.currentUser && !ranking.entries.some(entry => entry.id === ranking.currentUser?.id)
  const eligible = isOwner || isMember
  const number = (value: number) => value.toLocaleString(locale)
  const duration = (value: number) => {
    const minutes = Math.max(0, Math.round(value))
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return hours > 0 ? `${number(hours)}${copy.hoursShort}${rest ? ` ${number(rest)}${copy.minutesShort}` : ''}` : `${number(minutes)}${copy.minutesShort}`
  }

  const openEditor = () => {
    const next = { title: challenge?.title ?? '', target: String(challenge?.targetMinutes ?? 50) }
    setDraft(next)
    setInitialDraft(next)
    setExpectedUpdatedAt(challenge?.updatedAt ?? null)
    setFieldErrors({})
    setConflicted(false)
    setDiscardOpen(false)
    setEditorOpen(true)
  }

  const closeEditor = () => {
    if (savingRef.current) return
    if (dirty && !discardOpen) setDiscardOpen(true)
    else if (discardOpen) setDiscardOpen(false)
    else setEditorOpen(false)
  }

  const saveChallenge = async () => {
    if (savingRef.current || conflicted || !isOwner) return
    const title = draft.title.trim()
    const targetMinutes = Number(draft.target)
    const nextErrors: typeof fieldErrors = {}
    if (!title || title.length > 80) nextErrors.title = copy.nameError
    if (!/^\d+$/.test(draft.target.trim()) || !Number.isInteger(targetMinutes) || targetMinutes < 5 || targetMinutes > 480) nextErrors.target = copy.targetError
    setFieldErrors(nextErrors)
    if (nextErrors.title || nextErrors.target) {
      if (nextErrors.title) nameRef.current?.focus()
      else targetRef.current?.focus()
      return
    }
    if (!token) { setFieldErrors({ form: copy.saveAuthError }); return }

    savingRef.current = true
    setSaving(true)
    const controller = new AbortController()
    controllers.current.add(controller)
    const timeout = window.setTimeout(() => controller.abort(), 20_000)
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/challenge`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, targetMinutes, expectedUpdatedAt }), signal: controller.signal,
      })
      if (!mounted.current || activeToken.current !== token) return
      if (!response.ok) {
        setFieldErrors({ form: response.status === 409 ? copy.conflict : [401, 403].includes(response.status) ? copy.saveAuthError : copy.saveError })
        if (response.status === 409) { setConflicted(true); void mutate() }
        return
      }
      setEditorOpen(false)
      setSaved(true)
      void mutate()
    } catch {
      if (mounted.current && activeToken.current === token) setFieldErrors({ form: copy.saveError })
    } finally {
      window.clearTimeout(timeout)
      controllers.current.delete(controller)
      savingRef.current = false
      if (mounted.current) setSaving(false)
    }
  }

  const avatar = (person: { id: string; username: string; avatarUrl?: string }) => (
    <span className={styles.avatar} aria-hidden="true">
      {person.avatarUrl ? <Image src={person.avatarUrl} alt="" width={32} height={32} loading="lazy" />
        : getParticipantIdentity(person.username, t.activeSessions.guest).isGuest ? <GuestAvatar userId={person.id} />
          : person.username.slice(0, 1).toUpperCase()}
    </span>
  )

  const rankRow = (entry: RoomLeaderboardEntry, pinned = false) => (
    <li key={entry.id} className={`${styles.rankRow} ${entry.id === user?.id ? styles.yourRow : ''} ${pinned ? styles.pinned : ''}`}>
      <span className={styles.rankPosition} aria-label={`${copy.position} ${entry.rank}`}>{entry.rank <= 3 ? <Trophy size={14} aria-hidden="true" /> : null}{number(entry.rank)}</span>
      <Link href={userProfileHref(entry)} className={styles.person}>
        {avatar(entry)}
        <span className={styles.personName}><ParticipantName username={entry.username} guestLabel={t.activeSessions.guest} />{entry.id === user?.id && <small>{copy.you}</small>}</span>
      </Link>
      <strong className={styles.rankTime}>{duration(entry.minutes)}</strong>
    </li>
  )

  const dateLabel = (date: string, weekday: 'short' | 'long') => new Date(`${date.slice(0, 10)}T12:00:00Z`).toLocaleDateString(locale, { weekday, ...(weekday === 'long' ? { month: 'short' as const, day: 'numeric' as const } : {}), timeZone: 'UTC' })
  const maximumMinutes = Math.max(1, ...(stats?.weeklyActivity.map(day => day.minutes) ?? [1]))

  return <>
    <div className={`${styles.dashboard} ${!stats ? styles.dashboardLoading : ''}`} data-no-translate>
      {liveActivity && <div className={styles.live}>{liveActivity}</div>}
      {!stats ? <div className={`${styles.loading} community-panel`} role="status">
        {(isLoading || authLoading) && !error ? <><span className="community-spinner" aria-hidden="true" />{copy.loading}</> : <>
          <p>{accessChanged ? copy.accessChanged : copy.unavailable}</p>
          <button type="button" className="community-button" disabled={isValidating} onClick={() => accessChanged ? window.location.reload() : void mutate()}>{accessChanged ? copy.reload : copy.retry}</button>
        </>}
      </div> : <>
        {error && <div className={styles.refreshError} role="status"><p>{copy.stale}</p><button type="button" className="community-button" disabled={isValidating} onClick={() => void mutate()}>{copy.retry}</button></div>}

        <section className={`community-panel ${styles.challenge} ${styles.panel}`} aria-labelledby="room-challenge-heading">
          <header className={styles.heading}>
            <div><p className={styles.eyebrow}><Target size={14} aria-hidden="true" />{copy.challenge}</p><h2 id="room-challenge-heading">{challenge?.title ?? copy.noChallenge}</h2></div>
            {isOwner && challenge && <button type="button" className="community-icon-button" onClick={openEditor} aria-label={copy.editChallenge}><Pencil size={15} aria-hidden="true" /></button>}
          </header>
          {challenge ? <>
            <p className={styles.challengeTarget}><strong>{duration(challenge.targetMinutes)}</strong><span>{copy.eachDay}</span></p>
            <div className={styles.goalResult}><strong>{number(challenge.achievedCount)}<span> / {number(challenge.participantCount)}</span></strong><p>{copy.reached}</p></div>
            <progress className={styles.progress} value={challenge.achievedCount} max={Math.max(1, challenge.participantCount)} aria-label={copy.goalProgress} />
            {challenge.participantCount > 0 && challenge.achievedCount === challenge.participantCount && <p className={styles.success}><Check size={15} aria-hidden="true" />{copy.allReached}</p>}
            {challenge.achievers.length > 0 ? <div className={styles.achievers} aria-label={copy.achieved}>
              {challenge.achievers.slice(0, 5).map(person => <Link href={userProfileHref(person)} key={person.id} aria-label={`${getParticipantIdentity(person.username, t.activeSessions.guest).displayName}: ${copy.achieved}`}>{avatar(person)}</Link>)}
              <span>{challenge.achievers.slice(0, 2).map(person => getParticipantIdentity(person.username, t.activeSessions.guest).displayName).join(', ')}{challenge.achievedCount > 2 && ` +${number(challenge.achievedCount - 2)} ${copy.moreAchievers}`}</span>
            </div> : <p className={styles.help}>{copy.noAchievers}</p>}
            {challenge.isParticipant && <div className={styles.ownGoal}>
              <div><span>{challenge.currentUserAchieved ? copy.goalDone : copy.yourProgress}</span><strong>{duration(challenge.currentUserMinutes)} / {duration(challenge.targetMinutes)}</strong></div>
              <progress className={`${styles.progress} ${styles.personalProgress}`} value={Math.min(challenge.currentUserMinutes, challenge.targetMinutes)} max={challenge.targetMinutes} aria-label={copy.yourProgress} />
              {!challenge.currentUserAchieved && <p>{duration(Math.max(0, challenge.targetMinutes - challenge.currentUserMinutes))} {copy.remaining}</p>}
            </div>}
            <button type="button" disabled={!challenge.currentUserAchieved && !canStartFocus} className={`community-button ${challenge.currentUserAchieved ? '' : 'community-button-primary'} ${styles.fullButton}`} onClick={challenge.currentUserAchieved ? onShare : onStartFocus}>
              {challenge.currentUserAchieved ? <Share2 size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}{challenge.currentUserAchieved ? copy.shareWin : eligible ? copy.focus : copy.join}
            </button>
          </> : <>
            <div className={styles.emptyGoal}><Sprout size={38} strokeWidth={1.3} aria-hidden="true" /><p>{isOwner ? copy.noChallengeHint : copy.ownerCreates}</p></div>
            {isOwner ? <button type="button" className={`community-button community-button-primary ${styles.fullButton}`} onClick={openEditor}><Plus size={15} aria-hidden="true" />{copy.createChallenge}</button>
              : <button type="button" disabled={!canStartFocus} className={`community-button ${styles.fullButton}`} onClick={onStartFocus}><Play size={15} aria-hidden="true" />{eligible ? copy.focus : copy.join}</button>}
          </>}
          <p className={styles.reset}><Clock size={12} aria-hidden="true" />{copy.reset}</p>
          <div className={styles.status} role="status">{saved ? <><Check size={14} aria-hidden="true" />{copy.updated}</> : null}</div>
        </section>

        <section className={`community-panel ${styles.personal} ${styles.panel}`} aria-labelledby="room-personal-heading">
          <header className={styles.heading}><div><h2 id="room-personal-heading"><Sprout size={18} aria-hidden="true" />{copy.contribution}</h2></div></header>
          {personal ? <>
            <dl className={styles.personalMetrics}>
              <div className={styles.todayMetric}><dt>{copy.today}</dt><dd>{duration(personal.todayMinutes)}</dd></div>
              <div><dt>{copy.week}</dt><dd>{duration(personal.weekMinutes)}</dd></div>
              <div><dt>{copy.allTime}</dt><dd>{duration(personal.allTimeMinutes)}</dd></div>
            </dl>
            <div className={styles.shareContribution}><strong>{personal.contributionPercent.toLocaleString(locale, { maximumFractionDigits: 1 })}%</strong><span>{copy.yourShare}</span></div>
            <div className={styles.personalFacts}><span><Flame size={14} aria-hidden="true" /><strong>{number(personal.currentStreak)}</strong> {copy.streak}</span><span><strong>{number(personal.activeDays)}</strong> {copy.activeDays}</span></div>
            <div className={styles.personalRank}><span>{copy.rank}</span><strong>{stats.leaderboards.today.currentUser ? `#${number(stats.leaderboards.today.currentUser.rank)}` : copy.noRank}</strong></div>
            {personal.allTimeMinutes === 0 && <p className={styles.help}>{copy.personalEmpty}</p>}
          </> : <div className={styles.personalEmpty}><p>{copy.personalGuest}</p><button type="button" disabled={!canStartFocus} className="community-button" onClick={onStartFocus}>{copy.join}</button></div>}
        </section>

        <section className={`community-panel ${styles.leaderboard} ${styles.panel}`} aria-labelledby="room-ranking-heading">
          <header className={styles.heading}><div><h2 id="room-ranking-heading"><Trophy size={18} aria-hidden="true" />{copy.leaderboard}</h2></div></header>
          <div className={styles.periods} role="group" aria-label={copy.period}>{(['today', 'week', 'allTime'] as const).map(value => <button type="button" key={value} aria-pressed={period === value} onClick={() => { setPeriod(value); if (rankingRef.current) rankingRef.current.scrollTop = 0 }}>{copy[value]}</button>)}</div>
          {ranking?.entries.length ? <>
            <div className={styles.rankingLabels} aria-hidden="true"><span>{copy.coworker}</span><span>{copy.focusTime}</span></div>
            <ol ref={rankingRef} className={styles.rankList} aria-label={`${copy.leaderboard}: ${copy[period]}`} tabIndex={ranking.entries.length > 6 ? 0 : undefined}>{ranking.entries.map(entry => rankRow(entry))}</ol>
            {currentUserOutsideList && ranking.currentUser && <div className={styles.yourPosition}><p>{copy.yourPosition}</p><ol aria-label={copy.yourPosition}>{rankRow(ranking.currentUser, true)}</ol></div>}
            <p className={styles.rankingCount}>{number(ranking.totalParticipants)} {copy.rankedPeople}{ranking.totalParticipants > 20 && ` · ${copy.top20}`}</p>
          </> : <div className={styles.rankingEmpty}><Trophy size={26} strokeWidth={1.3} aria-hidden="true" /><strong>{copy.noRanking}</strong><p>{copy.noRankingHint}</p><button type="button" disabled={!canStartFocus} className="community-button" onClick={onStartFocus}>{eligible ? copy.focus : copy.join}</button></div>}
          <p className={styles.help}>{copy.rankingRules}</p>
        </section>

        <section className={`community-panel ${styles.activity} ${styles.panel}`} aria-labelledby="room-activity-heading">
          <header className={styles.heading}><div><h2 id="room-activity-heading"><Flame size={18} aria-hidden="true" />{copy.activity}</h2></div><div className={styles.streak}><strong>{number(stats.roomStreak)}</strong><span>{copy.roomStreak}</span></div></header>
          <div className={styles.todaySummary}><span><strong>{duration(stats.todayFocusMinutes)}</strong> {copy.todayFocus}</span><span><Users size={14} aria-hidden="true" /><strong>{number(stats.todayParticipants)}</strong> {copy.todayPeople}</span></div>
          <div className={styles.chartLegend}><span><i className={styles.teamSwatch} />{copy.team}</span>{personal && <span><i className={styles.ownSwatch} />{copy.yourTime}</span>}</div>
          <div className={styles.chart} aria-hidden="true">{stats.weeklyActivity.map(day => <div className={styles.dayColumn} key={day.date}>
            <span className={styles.dayValue}>{duration(day.minutes)}</span>
            <div className={styles.barWell}><div className={styles.teamBar} style={{ height: `${day.minutes / maximumMinutes * 100}%` }}>{day.ownMinutes > 0 && <div className={styles.ownBar} style={{ height: `${Math.min(100, day.ownMinutes / Math.max(1, day.minutes) * 100)}%` }} />}</div></div>
            <span className={styles.dayLabel}>{dateLabel(day.date, 'short')}</span>
          </div>)}</div>
          <details className={styles.dailyValues}><summary>{copy.dailyValues}</summary><table><caption className={styles.srOnly}>{copy.activity}</caption><thead><tr><th scope="col">{copy.day}</th><th scope="col">{copy.team}</th>{personal && <th scope="col">{copy.yourTime}</th>}</tr></thead><tbody>{stats.weeklyActivity.map(day => <tr key={day.date}><th scope="row">{dateLabel(day.date, 'long')}</th><td>{duration(day.minutes)}</td>{personal && <td>{duration(day.ownMinutes)}</td>}</tr>)}</tbody></table></details>
          <p className={styles.help}>{stats.roomStreak ? copy.streakHint : copy.noStreak}</p>
          <div className={styles.totals}><span>{copy.totalFocus}<strong>{duration(stats.totalFocusMinutes)}</strong></span><span>{copy.completedPomodoros}<strong>{number(stats.totalPomodoros)}</strong></span></div>
        </section>
        <p className={styles.footnote}>{copy.counted}</p>
      </>}
    </div>
    <CommunityDialog open={editorOpen && isOwner} title={discardOpen ? copy.discardTitle : challenge ? copy.editChallenge : copy.createChallenge} description={discardOpen ? copy.discardHint : copy.challengeRules} busy={saving} onClose={closeEditor}>
      {discardOpen ? <div className="community-dialog-actions"><button autoFocus type="button" className="community-button" onClick={() => setDiscardOpen(false)}>{copy.keepEditing}</button><button type="button" className="community-button" onClick={() => { setDiscardOpen(false); setEditorOpen(false) }}>{copy.discard}</button></div> : <form noValidate onCompositionStart={() => { composingRef.current = true }} onCompositionEnd={() => { composingRef.current = false }} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }} onSubmit={event => { event.preventDefault(); if (!composingRef.current) void saveChallenge() }}>
        <label className="community-field" htmlFor="room-challenge-title"><span>{copy.challengeTitle}</span><input id="room-challenge-title" ref={nameRef} value={draft.title} maxLength={80} placeholder={copy.challengePlaceholder} disabled={saving} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? 'room-challenge-title-error' : undefined} onChange={event => { setDraft(previous => ({ ...previous, title: event.target.value })); setFieldErrors(previous => ({ ...previous, title: undefined })) }} /></label>
        {fieldErrors.title && <p id="room-challenge-title-error" className={styles.fieldError}>{fieldErrors.title}</p>}
        <label className="community-field" htmlFor="room-challenge-target"><span>{copy.targetLabel}</span><input id="room-challenge-target" ref={targetRef} value={draft.target} type="number" inputMode="numeric" min={5} max={480} step={1} disabled={saving} aria-invalid={Boolean(fieldErrors.target)} aria-describedby={`room-challenge-target-help${fieldErrors.target ? ' room-challenge-target-error' : ''}`} onChange={event => { setDraft(previous => ({ ...previous, target: event.target.value })); setFieldErrors(previous => ({ ...previous, target: undefined })) }} /></label>
        {fieldErrors.target && <p id="room-challenge-target-error" className={styles.fieldError}>{fieldErrors.target}</p>}
        <div className={styles.presets} role="group" aria-label={copy.targetPresets}>{[25, 50, 90, 120].map(minutes => <button type="button" className="community-button" key={minutes} aria-pressed={draft.target === String(minutes)} disabled={saving} onClick={() => { setDraft(previous => ({ ...previous, target: String(minutes) })); setFieldErrors(previous => ({ ...previous, target: undefined })) }}>{duration(minutes)}</button>)}</div>
        <p id="room-challenge-target-help" className={styles.help}>{copy.targetHint}</p>
        {challenge && <p className={styles.editWarning}>{copy.editWarning}</p>}
        {fieldErrors.form && <p className="community-error" role="alert">{fieldErrors.form}</p>}
        <div className="community-dialog-actions"><button type="button" className="community-button" disabled={saving} onClick={closeEditor}>{copy.cancel}</button><button type="submit" className={`community-button community-button-primary ${styles.saveButton}`} disabled={saving || conflicted} aria-busy={saving}>{saving ? copy.saving : copy.save}</button></div>
      </form>}
    </CommunityDialog>
  </>
}
