'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, Flame, Search, Sprout, Trophy, Users, X } from 'lucide-react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { es } from 'react-day-picker/locale'
import Navbar from '@/components/Navbar'
import { useAuthStore } from '@/store/useAuthStore'
import { useI18n } from '@/components/I18nProvider'
import { leaderboardCopy } from '@/lib/i18n/leaderboard'
import 'react-day-picker/dist/style.css'
import './leaderboard.css'

type LeaderboardPeriod = 'day' | 'week' | 'month' | 'year' | 'custom'
interface LeaderboardUser {
  id: string
  username: string
  avatarUrl?: string
  totalPomodoros: number
  totalMinutes: number
  rank: number
}
interface LeaderboardResponse {
  periodLabel: string
  leaderboard: LeaderboardUser[]
  currentUser: LeaderboardUser | null
  periodTotals: { totalMinutes: number; totalPomodoros: number }
}
interface BoardView {
  period: LeaderboardPeriod
  offset: number
  start: string
  end: string
  search: string
  page: number
}
const PAGE_SIZE = 20
const initialView: BoardView = { period: 'month', offset: 0, start: '', end: '', search: '', page: 1 }
const formatTime = (minutes: number) => `${Math.floor(minutes / 60)}:${String(Math.floor(minutes % 60)).padStart(2, '0')}`

function readView(): BoardView {
  const params = new URLSearchParams(window.location.search)
  const requested = params.get('period')
  let period: LeaderboardPeriod = requested === 'day' || requested === 'week' || requested === 'year' || requested === 'custom' ? requested : 'month'
  const start = params.get('startDate') || ''
  const end = params.get('endDate') || ''
  const validRange = Number.isFinite(Date.parse(start)) && Number.isFinite(Date.parse(end)) && Date.parse(start) <= Date.parse(end)
  if (period === 'custom' && !validRange) period = 'month'
  return {
    period, offset: Math.max(0, Math.min(1000, Number.parseInt(params.get('offset') || '0', 10) || 0)),
    start: validRange ? start : '', end: validRange ? end : '',
    search: params.get('q') || '', page: Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1),
  }
}

function Avatar({ user, large = false }: { user: LeaderboardUser; large?: boolean }) {
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

export default function UsersPage() {
  const { user: currentUser, token } = useAuthStore()
  const { language, t } = useI18n()
  const copy = leaderboardCopy[language]
  const locale = language === 'es' ? 'es-ES' : 'en-US'
  const number = (value: number) => value.toLocaleString(locale)
  const [view, setView] = useState<BoardView>(initialView)
  const [ready, setReady] = useState(false)
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [showCalendar, setShowCalendar] = useState(false)
  const [draftRange, setDraftRange] = useState<DateRange>()
  const calendarTrigger = useRef<HTMLButtonElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const rankingHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const restore = () => { setView(readView()); setReady(true); setShowCalendar(false) }
    restore()
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [])

  const updateView = (patch: Partial<BoardView>) => {
    const next = { ...view, ...patch }
    const url = new URL(window.location.href)
    url.searchParams.set('period', next.period)
    for (const [key, value] of Object.entries({ offset: next.offset ? String(next.offset) : '', startDate: next.period === 'custom' ? next.start : '', endDate: next.period === 'custom' ? next.end : '', q: next.search, page: next.page > 1 ? String(next.page) : '' })) {
      if (value) url.searchParams.set(key, value)
      else url.searchParams.delete(key)
    }
    window.history.replaceState(null, '', url)
    setView(next)
  }

  useEffect(() => {
    if (!ready) return
    const controller = new AbortController()
    let active = true
    let timedOut = false
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort() }, 20000)
    setLoading(true)
    setError(false)
    setData(null)
    const params = new URLSearchParams({ period: view.period, offset: String(view.offset), locale: language })
    if (view.period === 'custom') {
      params.set('startDate', view.start)
      params.set('endDate', view.end)
    }
    fetch(`/api/stats/leaderboard?${params}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Leaderboard request failed')
        const result: LeaderboardResponse = await response.json()
        if (active && !controller.signal.aborted) setData(result)
      })
      .catch(() => { if (active && (!controller.signal.aborted || timedOut)) setError(true) })
      .finally(() => {
        window.clearTimeout(timeout)
        if (active && (!controller.signal.aborted || timedOut)) setLoading(false)
      })
    return () => { active = false; window.clearTimeout(timeout); controller.abort() }
  }, [ready, view.period, view.offset, view.start, view.end, language, token, retry])

  const leaderboard = (data?.leaderboard ?? []).filter(person => person.totalMinutes > 0)
  const filtered = leaderboard.filter(person => person.username.toLocaleLowerCase(locale).includes(view.search.trim().toLocaleLowerCase(locale)))
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(view.page, pageCount)
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const myRank = data?.currentUser?.totalMinutes ? data.currentUser : null
  const maxMinutes = leaderboard[0]?.totalMinutes || 1
  const progress = myRank ? Math.min(100, Math.round(myRank.totalMinutes / maxMinutes * 100)) : 0
  const periods = [{ value: 'day', label: t.leaderboard.today }, { value: 'week', label: t.leaderboard.week }, { value: 'month', label: t.leaderboard.month }, { value: 'year', label: t.leaderboard.year }] as const
  const closeCalendar = () => { setShowCalendar(false); calendarTrigger.current?.focus() }
  const clearSearch = () => { updateView({ search: '', page: 1 }); searchInput.current?.focus() }
  const changePage = (next: number) => { updateView({ page: next }); rankingHeading.current?.focus() }
  const profileHref = (id: string) => `/user/${encodeURIComponent(id)}`
  const draftLabel = draftRange?.from
    ? `${draftRange.from.toLocaleDateString(locale)} — ${draftRange.to ? draftRange.to.toLocaleDateString(locale) : copy.rangeEnd}`
    : copy.rangeEmpty

  return (
    <>
      <Navbar />
      <div className="garden-page lb-page" data-i18n-ignore>
        <main className="lb-layout">
          <header className="lb-intro">
            <div>
              <p className="lb-eyebrow"><Sprout size={16} aria-hidden="true" />{copy.eyebrow}</p>
              <h1>{t.leaderboard.title}</h1>
              <p className="lb-subtitle">{copy.subtitle}</p>
              <p className="lb-description">{copy.description}</p>
            </div>
            <Link href="/" className="lb-button"><ArrowLeft size={16} aria-hidden="true" />{copy.backToTimer}</Link>
          </header>

          <section className="pixel-panel lb-controls" aria-label={t.leaderboard.customRange}>
            <div className="lb-toolbar">
              <div className="lb-periods" role="group" aria-label={copy.currentPeriod}>
                {periods.map(period => <button key={period.value} type="button" aria-pressed={view.period === period.value} onClick={() => { updateView({ period: period.value, offset: 0, page: 1 }); setShowCalendar(false) }}>{period.label}</button>)}
              </div>
              <div className="lb-date-nav">
                <button className="lb-icon-button" type="button" aria-label={copy.previousPeriod} title={copy.previousPeriod} disabled={view.period === 'custom' || view.offset >= 1000} onClick={() => updateView({ offset: view.offset + 1, page: 1 })}><ChevronLeft size={18} /></button>
                <button className="lb-date-trigger" ref={calendarTrigger} type="button" aria-expanded={showCalendar} aria-controls="leaderboard-calendar" onClick={() => {
                  if (!showCalendar) setDraftRange(view.start && view.end ? { from: new Date(view.start), to: new Date(view.end) } : undefined)
                  setShowCalendar(value => !value)
                }}>
                  <CalendarDays size={16} aria-hidden="true" />
                  <span>{loading ? t.leaderboard.customRange : data?.periodLabel || t.leaderboard.customRange}</span>
                </button>
                <button className="lb-icon-button" type="button" aria-label={copy.nextPeriod} title={copy.nextPeriod} disabled={view.offset === 0 || view.period === 'custom'} onClick={() => updateView({ offset: Math.max(0, view.offset - 1), page: 1 })}><ChevronRight size={18} /></button>
              </div>
            </div>
            {showCalendar && <div id="leaderboard-calendar" className="lb-calendar" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); closeCalendar() } }}>
              <div className="lb-calendar-copy">
                <span className="lb-eyebrow"><CalendarDays size={16} aria-hidden="true" />{t.leaderboard.customRange}</span>
                <h2>{t.leaderboard.customRange}</h2>
                <p>{copy.rangeHint}</p>
                <p className="lb-range-selection" aria-live="polite">{draftLabel}</p>
                <div className="lb-calendar-actions">
                  <button type="button" className="btn btn-primary" disabled={!draftRange?.from || !draftRange?.to} onClick={() => {
                    if (!draftRange?.from || !draftRange?.to) return
                    updateView({ period: 'custom', offset: 0, start: draftRange.from.toISOString(), end: draftRange.to.toISOString(), page: 1 })
                    closeCalendar()
                  }}>{t.leaderboard.apply}</button>
                  <button type="button" className="lb-button" onClick={closeCalendar}>{t.leaderboard.cancel}</button>
                </div>
              </div>
              <DayPicker mode="range" selected={draftRange} onSelect={setDraftRange} defaultMonth={draftRange?.from} locale={language === 'es' ? es : undefined} />
            </div>}
          </section>

          <section className="lb-totals" aria-label={copy.community}>
            {[{ icon: Users, label: t.leaderboard.activeUsers, value: number(leaderboard.length), note: copy.community }, { icon: Clock3, label: t.leaderboard.focusTime, value: formatTime(data?.periodTotals.totalMinutes ?? 0), note: copy.timeUnit }, { icon: Flame, label: t.leaderboard.pomodoros, value: number(data?.periodTotals.totalPomodoros ?? 0), note: copy.sessions }].map(stat => <div className="lb-total" key={stat.label}>
              <stat.icon size={18} aria-hidden="true" />
              <div><p>{stat.label}</p><strong>{loading || error ? '—' : stat.value}</strong><span>{stat.note}</span></div>
            </div>)}
          </section>

          {(loading || (!error && leaderboard.length > 0)) && <section className="lb-leaders" aria-labelledby="lb-leaders-title" aria-busy={loading}>
            <div className="lb-section-label"><h2 id="lb-leaders-title"><Trophy size={16} aria-hidden="true" />{copy.leaders}</h2><span>{data?.periodLabel}</span></div>
            {loading ? <div className="lb-leaders-loading" aria-hidden="true">—</div> : <ol className="lb-podium">
              {leaderboard.slice(0, 3).map(person => <li key={person.id} className={`lb-leader lb-leader-${person.rank}`}>
                <Link href={profileHref(person.id)} className="lb-leader-link">
                  <span className="lb-leader-rank">{String(person.rank).padStart(2, '0')}</span>
                  <Avatar user={person} large />
                  <div className="lb-leader-info"><span className="lb-leader-label">{person.rank === 1 ? <Trophy size={14} aria-hidden="true" /> : null}{copy.rank} {person.rank}{person.id === currentUser?.id && <span className="lb-you">{t.leaderboard.you}</span>}</span><h3>{person.username}</h3><p><strong>{formatTime(person.totalMinutes)}</strong><span>{copy.timeUnit}</span></p></div>
                  <ArrowUpRight className="lb-leader-arrow" size={18} aria-hidden="true" />
                </Link>
              </li>)}
            </ol>}
          </section>}

          <div className="lb-content">
            <section className="pixel-panel lb-ranking" aria-labelledby="lb-ranking-title" aria-busy={loading}>
              <div className="lb-ranking-header">
                <div><h2 id="lb-ranking-title" ref={rankingHeading} tabIndex={-1}>{t.leaderboard.fullRanking}</h2><p>{copy.howNote}</p></div>
                <div className="lb-search">
                  <Search size={16} aria-hidden="true" />
                  <input ref={searchInput} type="search" value={view.search} aria-label={t.leaderboard.searchUsers} placeholder={t.leaderboard.searchUsers} onChange={event => updateView({ search: event.target.value, page: 1 })} />
                  {view.search && <button type="button" className="lb-icon-button" aria-label={copy.clearSearch} title={copy.clearSearch} onClick={clearSearch}><X size={16} /></button>}
                </div>
              </div>
              {loading ? <div className="lb-state" role="status"><span className="lb-spinner" aria-hidden="true" /><p>{copy.loading}</p></div>
                : error ? <div className="lb-state" role="alert"><Trophy size={32} aria-hidden="true" /><h3>{t.leaderboard.errorTitle}</h3><p>{t.leaderboard.errorDescription}</p><button type="button" className="lb-button" onClick={() => setRetry(value => value + 1)}>{t.leaderboard.tryAgain}</button></div>
                : leaderboard.length === 0 ? <div className="lb-state"><Sprout size={36} aria-hidden="true" /><h3>{t.leaderboard.emptyTitle}</h3><p>{t.leaderboard.emptyDescriptionPrefix} {data?.periodLabel}.</p><Link href="/" className="btn btn-primary">{copy.startFocus}</Link></div>
                : filtered.length === 0 ? <div className="lb-state" role="status"><Search size={32} aria-hidden="true" /><h3>{t.leaderboard.noMatchesTitle}</h3><p>{t.leaderboard.noMatchesDescription} “{view.search}”</p><button type="button" className="lb-button" onClick={clearSearch}>{copy.clearSearch}</button></div>
                : <>
                  <div className="lb-table-wrap">
                    <table className="lb-table">
                      <caption className="sr-only">{t.leaderboard.fullRanking} — {data?.periodLabel}</caption>
                      <thead><tr><th scope="col">{copy.rank}</th><th scope="col">{copy.participant}</th><th scope="col">{t.leaderboard.focus} <span>({copy.timeUnit})</span></th><th scope="col">{t.leaderboard.pomos}</th></tr></thead>
                      <tbody>{pageRows.map(person => <tr key={person.id} className={person.id === currentUser?.id ? 'lb-row-self' : undefined}>
                        <td><span className={`lb-position${person.rank <= 3 ? ' lb-position-top' : ''}`}>{String(person.rank).padStart(2, '0')}</span></td>
                        <th scope="row"><Link href={profileHref(person.id)} className="lb-person"><Avatar user={person} /><span className="lb-person-name">{person.username}{person.id === currentUser?.id && <span className="lb-you">{t.leaderboard.you}</span>}</span></Link></th>
                        <td><strong className="lb-time">{formatTime(person.totalMinutes)}</strong><span className="lb-time-track" aria-hidden="true"><span style={{ width: `${Math.max(1, person.totalMinutes / maxMinutes * 100)}%` }} /></span></td>
                        <td className="lb-pomos">{number(person.totalPomodoros)}</td>
                      </tr>)}</tbody>
                    </table>
                  </div>
                  <nav className="lb-pagination" aria-label={t.leaderboard.fullRanking}>
                    <span role="status">{number((page - 1) * PAGE_SIZE + 1)}–{number(Math.min(page * PAGE_SIZE, filtered.length))} {copy.of} {number(filtered.length)}</span>
                    <div><button type="button" className="lb-icon-button" disabled={page <= 1} aria-label={copy.previousPage} title={copy.previousPage} onClick={() => changePage(page - 1)}><ChevronLeft size={18} /></button><span>{copy.page} {number(page)} {copy.of} {number(pageCount)}</span><button type="button" className="lb-icon-button" disabled={page >= pageCount} aria-label={copy.nextPage} title={copy.nextPage} onClick={() => changePage(page + 1)}><ChevronRight size={18} /></button></div>
                  </nav>
                </>}
            </section>

            <aside className="lb-sidebar">
              <section className="pixel-panel lb-personal" aria-labelledby="lb-personal-title">
                <div className="lb-panel-title"><Sprout size={17} aria-hidden="true" /><h2 id="lb-personal-title">{copy.yourPlace}</h2></div>
                <div className="lb-personal-body">
                  {loading ? <div className="lb-personal-placeholder" aria-hidden="true">—</div> : error ? <p>{t.leaderboard.failedToLoad}</p> : myRank ? <>
                    <Link href={profileHref(myRank.id)} className="lb-profile"><Avatar user={myRank} /><span>{myRank.username}<small>{copy.viewProfile} <ArrowUpRight size={12} aria-hidden="true" /></small></span></Link>
                    <div className="lb-my-place"><strong>#{number(myRank.rank)}</strong><span>{t.leaderboard.top} {Math.max(1, Math.round(myRank.rank / Math.max(1, leaderboard.length) * 100))}%</span></div>
                    <dl className="lb-personal-stats"><div><dt>{t.leaderboard.focus} <span>({copy.timeUnit})</span></dt><dd>{formatTime(myRank.totalMinutes)}</dd></div><div><dt>{t.leaderboard.pomos}</dt><dd>{number(myRank.totalPomodoros)}</dd></div></dl>
                    <div className="lb-progress-label"><span>{t.leaderboard.progressToFirst}</span><strong>{progress}%</strong></div>
                    <progress className="lb-progress" value={progress} max={100} aria-label={t.leaderboard.progressToFirst} />
                  </> : <div className="lb-personal-empty"><Sprout size={36} aria-hidden="true" /><p>{currentUser && !currentUser.isAnonymous ? `${t.leaderboard.timeToAppearPrefix} ${data?.periodLabel ?? ''} ${t.leaderboard.timeToAppearSuffix}` : t.leaderboard.loginToSeePosition}</p></div>}
                  <Link href="/" className="btn btn-primary lb-focus-link">{copy.startFocus}<ArrowUpRight size={16} aria-hidden="true" /></Link>
                  <p className="lb-encouragement">{copy.encouragement}</p>
                </div>
              </section>
              <section className="lb-explainer"><h2>{copy.howTitle}</h2><p>{copy.howDescription}</p><p>{copy.howNote}</p></section>
            </aside>
          </div>
        </main>
      </div>
    </>
  )
}
