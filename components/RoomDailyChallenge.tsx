'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, Settings, Trophy } from 'lucide-react'
import CommunityDialog from '@/components/CommunityDialog'
import { useI18n } from '@/components/I18nProvider'
import { communityCopy } from '@/lib/i18n/community'
import { userProfileHref } from '@/lib/userProfile'
import { MIN_ROOM_CHALLENGE_MINUTES, MAX_ROOM_CHALLENGE_MINUTES, type RoomDailyChallenge as ChallengeData } from '@/lib/roomChallenge'

export default function RoomDailyChallenge({ roomId, token, isOwner, userId, membershipKey, onSaved, open, onOpen, onClose }: {
  roomId: string
  token: string | null
  isOwner: boolean
  userId?: string
  membershipKey: string
  onSaved: (message: string) => void
  open: boolean
  onOpen: () => void
  onClose: () => void
}) {
  const { language } = useI18n()
  const common = communityCopy[language]
  const copy = common.challenge
  const number = new Intl.NumberFormat(language === 'es' ? 'es-ES' : 'en-US')
  const { data, error, mutate } = useSWR<ChallengeData | null>(
    [`/api/rooms/${roomId}/challenge`, token, membershipKey],
    async ([url, authToken]: [string, string | null, string]) => {
      const response = await fetch(url, { headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined, cache: 'no-store' })
      if (!response.ok) throw new Error('Challenge unavailable')
      return response.json()
    },
    { refreshInterval: 30_000, revalidateOnFocus: true, shouldRetryOnError: false }
  )
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [invalidField, setInvalidField] = useState<'title' | 'target' | null>(null)
  const [visibleCount, setVisibleCount] = useState(10)
  const titleRef = useRef<HTMLInputElement>(null)
  const targetRef = useRef<HTMLInputElement>(null)
  const savingRef = useRef(false)
  const draftInitialized = useRef(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!open) { draftInitialized.current = false; return }
    if (data === undefined || draftInitialized.current) return
    draftInitialized.current = true
    setTitle(data?.title ?? '')
    setTarget(data ? String(data.targetMinutes) : '')
    setSaveError(null)
    setInvalidField(null)
  }, [open, data])

  // Do not leave yesterday's completed goals visible after the shared reset.
  useEffect(() => {
    if (!data) return
    const delay = new Date(data.resetsAt).getTime() - Date.now()
    if (delay <= 0) { setNow(Date.now()); return }
    const timeout = window.setTimeout(() => { setNow(Date.now()); void mutate().catch(() => undefined) }, delay + 50)
    return () => window.clearTimeout(timeout)
  }, [data, mutate])

  const current = data && new Date(data.resetsAt).getTime() > now ? data : undefined
  const completed = current?.participants.filter(person => person.minutes >= current.targetMinutes).length ?? 0
  const total = current?.participants.length ?? 0

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (savingRef.current || !isOwner || !token || data === undefined) return
    setSaveError(null)
    setInvalidField(null)
    const minutes = Number(target)
    if (!title.trim() || title.trim().length > 80) {
      setSaveError(copy.invalidTitle); setInvalidField('title'); titleRef.current?.focus(); return
    }
    if (!Number.isInteger(minutes) || minutes < MIN_ROOM_CHALLENGE_MINUTES || minutes > MAX_ROOM_CHALLENGE_MINUTES) {
      setSaveError(copy.invalidTarget); setInvalidField('target'); targetRef.current?.focus(); return
    }
    savingRef.current = true
    setSaving(true)
    try {
      const response = await fetch(`/api/rooms/${roomId}/challenge`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), targetMinutes: minutes }),
      })
      if (!response.ok) throw new Error('Save failed')
      const settings = await response.json() as { title: string; targetMinutes: number }
      // Apply the saved target immediately, then refresh the room's progress.
      void mutate(previous => previous ? { ...previous, ...settings } : previous).catch(() => undefined)
      onClose()
      onSaved(copy.saved)
    } catch {
      setSaveError(copy.saveError)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return <>
    {(data != null || error) && <section className="community-panel room-challenge" aria-labelledby="room-challenge-heading">
      <header className="community-panel-heading">
        <div className="room-challenge-heading-copy">
          <h2 id="room-challenge-heading"><Trophy size={18} aria-hidden="true" />{copy.heading}</h2>
          {current && <p className="room-challenge-name">{current.title}</p>}
        </div>
        <div className="community-actions">
          {isOwner && current && <button type="button" className="community-icon-button" aria-label={copy.settings} title={copy.settings} onClick={onOpen}><Settings size={16} aria-hidden="true" /></button>}
        </div>
      </header>
      {error && <div className="community-error" role="status">{copy.loadError} <button className="community-button" type="button" onClick={() => void mutate().catch(() => undefined)}>{common.retry}</button></div>}
      {!current ? <div className="room-challenge-pending" role="status">{!error && <><span className="community-spinner" aria-hidden="true" />{copy.loading}</>}</div> : <>
        {total === 0 ? <p className="community-muted">{copy.empty}</p> : <ul className="room-challenge-list">
          {current.participants.slice(0, visibleCount).map(person => {
            const done = person.minutes >= current.targetMinutes
            return <li key={person.id} className="room-challenge-person">
              <Link href={userProfileHref(person)} className="room-challenge-avatar" aria-label={person.username}>
                {person.avatarUrl ? <Image src={person.avatarUrl} alt="" width={32} height={32} className="community-avatar" /> : <span className="community-avatar" aria-hidden="true">{person.username.charAt(0).toUpperCase()}</span>}
              </Link>
              <div className="room-challenge-progress">
                <div className="room-challenge-participant-heading">
                  <Link href={userProfileHref(person)}>{person.username}{person.id === userId && <small>{copy.you}</small>}</Link>
                  <div className="room-challenge-time">
                    <strong>{number.format(person.minutes)} <small>{copy.minutes}</small>{done && <CheckCircle2 size={15} aria-label={copy.complete} />}</strong>
                    <span>{copy.ofTarget.replace('{minutes}', number.format(current.targetMinutes))}</span>
                  </div>
                </div>
                <progress className="room-challenge-meter" max={current.targetMinutes} value={Math.min(person.minutes, current.targetMinutes)} aria-label={`${person.username}: ${copy.goal.replace('{minutes}', number.format(current.targetMinutes))}`} />
              </div>
            </li>
          })}
        </ul>}
        {total > visibleCount && <button type="button" className="community-button" onClick={() => setVisibleCount(count => count + 10)}>{copy.more}</button>}
        <div className="room-challenge-team">
          <div className="room-challenge-label"><span>{copy.team}</span><span>{number.format(completed)} / {number.format(total)}</span></div>
          <progress className="room-challenge-meter" max={Math.max(1, total)} value={completed} aria-label={copy.team} />
        </div>
      </>}
    </section>}
    <CommunityDialog open={open} title={data ? copy.settings : copy.setGoal} variant="daily-goal" busy={saving} onClose={onClose}>
      {data === undefined ? <div role="status">{error ? <>{copy.loadError} <button type="button" className="community-button" onClick={() => void mutate().catch(() => undefined)}>{common.retry}</button></> : copy.loading}</div> :
      <form className="daily-goal-form" noValidate onSubmit={save} aria-busy={saving}>
        <label className="community-field" htmlFor="challenge-title">{copy.title}<input id="challenge-title" ref={titleRef} value={title} maxLength={80} disabled={saving} onChange={event => setTitle(event.target.value)} aria-invalid={invalidField === 'title'} aria-describedby={invalidField === 'title' ? 'challenge-save-error' : undefined} /></label>
        <fieldset className="daily-goal-targets" disabled={saving}>
          <label className="community-field" htmlFor="challenge-target">{copy.target}<input id="challenge-target" ref={targetRef} type="number" min={MIN_ROOM_CHALLENGE_MINUTES} max={MAX_ROOM_CHALLENGE_MINUTES} step={1} value={target} disabled={saving} onChange={event => setTarget(event.target.value)} aria-invalid={invalidField === 'target'} aria-describedby={invalidField === 'target' ? 'challenge-save-error' : undefined} /></label>
          <div className="daily-goal-presets">
            {[25, 50, 100, 150].map(minutes => <button key={minutes} type="button" className="community-button daily-goal-preset" aria-pressed={Number(target) === minutes} onClick={() => {
              setTarget(String(minutes))
              if (invalidField === 'target') { setInvalidField(null); setSaveError(null) }
            }}>{number.format(minutes)} <span>{copy.minutes}</span></button>)}
          </div>
        </fieldset>
        {saveError && <p id="challenge-save-error" className="community-error" role="alert">{saveError}</p>}
        <div className="community-dialog-actions"><button type="button" className="community-button" disabled={saving} onClick={onClose}>{common.cancel}</button><button type="submit" className="community-button community-button-primary room-challenge-save" disabled={saving}>{saving ? common.saving : common.save}</button></div>
      </form>}
    </CommunityDialog>
  </>
}
