'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Coffee, Pause, Radio, Sprout, WifiOff } from 'lucide-react'
import GuestAvatar from '@/components/GuestAvatar'
import ParticipantName, { getParticipantIdentity } from '@/components/ParticipantName'
import { useI18n } from '@/components/I18nProvider'
import { useSocket } from '@/hooks/useSocket'
import { roomActivityCopy } from '@/lib/i18n/roomActivity'
import { userProfileHref } from '@/lib/userProfile'
import { useAuthStore } from '@/store/useAuthStore'
import { useConnectionStore } from '@/store/useConnectionStore'
import { useTimerStore } from '@/store/useTimerStore'
import { SessionStatus, SessionType, type ActiveSession } from '@/types'
import styles from './RoomLiveActivity.module.css'

interface RoomLiveActivityProps {
  roomId: string
  onStartFocus?: () => void
  canStartFocus?: boolean
}

type AccessState = { roomId: string; token: string | null; status: 'allowed' | 'unavailable' | 'error' }

const getRemaining = (session: ActiveSession, now: number) => {
  const duration = Math.max(0, session.duration * 60)
  if (session.status === SessionStatus.PAUSED) return Math.min(duration, Math.max(0, session.timeRemaining))
  const start = new Date(session.startedAt).getTime()
  if (!Number.isFinite(start)) return 0
  return Math.min(duration, Math.max(0, duration - Math.floor((now - start) / 1000)))
}

const formatClock = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = String(total % 60).padStart(2, '0')
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${String(minutes).padStart(2, '0')}:${secs}`
}

/** Presence comes exclusively from the shared socket. Viewing never selects a room. */
export default function RoomLiveActivity({ roomId, onStartFocus, canStartFocus = false }: RoomLiveActivityProps) {
  const { refreshActiveSessions } = useSocket()
  const { language, t } = useI18n()
  const copy = roomActivityCopy[language]
  const headingId = useId()
  const token = useAuthStore(state => state.token)
  const currentUserId = useAuthStore(state => state.user?.id)
  const sessions = useTimerStore(state => state.activeSessions)
  const connected = useConnectionStore(state => state.isConnected)
  const checkingConnection = useConnectionStore(state => state.isChecking)
  const socketAccess = useConnectionStore(state => state.roomAccess)
  const [now, setNow] = useState(() => Date.now())
  const [access, setAccess] = useState<AccessState | null>(null)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const refreshRef = useRef<() => void>(() => {})
  const retry = useCallback(() => refreshRef.current(), [])
  const accessStatus = access?.roomId === roomId && access.token === token ? access.status : null
  const socketAllowed = socketAccess?.status === 'ready' && socketAccess.roomIds.includes(roomId)
  const available = connected && accessStatus === 'allowed' && socketAllowed

  useEffect(() => {
    let active = true
    let controller: AbortController | null = null
    let timeout: ReturnType<typeof setTimeout> | null = null
    let generation = 0
    const refresh = async () => {
      if (document.visibilityState === 'hidden') return
      const requestGeneration = ++generation
      controller?.abort()
      if (timeout) clearTimeout(timeout)
      const requestController = new AbortController()
      controller = requestController
      setCheckingAccess(true)
      timeout = setTimeout(() => requestController.abort(), 12000)
      try {
        const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: 'no-store',
          signal: requestController.signal,
        })
        if (!active || requestGeneration !== generation) return
        setAccess({ roomId, token, status: response.ok ? 'allowed' : [401, 403, 404].includes(response.status) ? 'unavailable' : 'error' })
        if (response.ok) refreshActiveSessions()
      } catch {
        if (active && requestGeneration === generation) setAccess({ roomId, token, status: 'error' })
      } finally {
        if (active && requestGeneration === generation) {
          if (timeout) clearTimeout(timeout)
          setCheckingAccess(false)
        }
      }
    }
    refreshRef.current = () => void refresh()
    void refresh()
    const interval = window.setInterval(() => void refresh(), 60000)
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('focus', onVisible)
    window.addEventListener('online', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      controller?.abort()
      if (timeout) clearTimeout(timeout)
      window.clearInterval(interval)
      window.removeEventListener('focus', onVisible)
      window.removeEventListener('online', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      refreshRef.current = () => {}
    }
  }, [roomId, token, refreshActiveSessions])

  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') setNow(Date.now()) }
    tick()
    const interval = window.setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  const visibleSessions = useMemo(() => {
    if (!available) return []
    return sessions
      .filter(session => session.roomId === roomId &&
        (!session.status || session.status === SessionStatus.ACTIVE || session.status === SessionStatus.PAUSED) &&
        getRemaining(session, now) > 0)
      .sort((a, b) => Number(b.userId === currentUserId) - Number(a.userId === currentUserId) ||
        Number(a.status === SessionStatus.PAUSED) - Number(b.status === SessionStatus.PAUSED) ||
        a.username.localeCompare(b.username, language))
  }, [sessions, roomId, available, now, currentUserId, language])

  const focusingCount = visibleSessions.filter(session => session.status !== SessionStatus.PAUSED &&
    (session.type === SessionType.WORK || session.type === SessionType.TIME_TRACKING)).length
  const socketLoading = !socketAccess || socketAccess.status === 'loading'
  const loading = checkingConnection || (connected && accessStatus !== 'error' && accessStatus !== 'unavailable' &&
    ((!accessStatus && checkingAccess) || socketLoading))
  const unavailable = accessStatus === 'unavailable' || (socketAccess?.status === 'ready' && !socketAllowed)
  const failed = accessStatus === 'error' || socketAccess?.status === 'error'

  return (
    <section className={`community-panel ${styles.panel}`} aria-labelledby={headingId} data-no-translate>
      <div className={styles.heading}>
        <div><h2 id={headingId}><Radio size={18} aria-hidden="true" />{copy.title}</h2></div>
        {available && <span className={styles.count} role="status"><span className={styles.dot} aria-hidden="true" />{focusingCount.toLocaleString(language)} {copy.focusing}</span>}
      </div>
      {loading ? (
        <div className={styles.state} role="status"><span className="community-spinner" aria-hidden="true" /><p>{checkingConnection ? copy.connecting : copy.checking}</p></div>
      ) : !available ? (
        <div className={styles.state} role="status">
          <WifiOff size={26} aria-hidden="true" />
          <p>{unavailable ? copy.unavailable : failed ? copy.accessError : copy.disconnected}</p>
          {failed && <button type="button" className="community-button" onClick={retry} disabled={checkingAccess}>{copy.retry}</button>}
        </div>
      ) : visibleSessions.length === 0 ? (
        <div className={styles.state}>
          <Sprout size={28} aria-hidden="true" /><h3>{copy.empty}</h3><p>{copy.emptyDescription}</p>
          {canStartFocus && onStartFocus && <button type="button" className="community-button" onClick={onStartFocus}>{copy.start}</button>}
        </div>
      ) : (
        <ul className={styles.list}>
          {visibleSessions.map(session => {
            const paused = session.status === SessionStatus.PAUSED
            const isBreak = session.type === SessionType.SHORT_BREAK || session.type === SessionType.LONG_BREAK
            const tracking = session.type === SessionType.TIME_TRACKING
            const remaining = getRemaining(session, now)
            const elapsed = Math.max(0, session.duration * 60 - remaining)
            const statusLabel = paused ? copy.paused : isBreak ? copy.break : tracking ? copy.tracking : copy.working
            const identity = getParticipantIdentity(session.username, t.activeSessions.guest)
            return (
              <li className={styles.item} key={session.id}>
                <div className={styles.row}>
                  <span className={styles.avatar} aria-hidden="true">
                    {session.avatarUrl ? <Image src={session.avatarUrl} alt="" width={36} height={36} loading="lazy" />
                      : identity.isGuest ? <GuestAvatar userId={session.userId} /> : session.username.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <div className={styles.name}>
                      <Link href={userProfileHref({ id: session.userId, username: session.username })} prefetch={false}>
                        <ParticipantName username={session.username} guestLabel={t.activeSessions.guest} />
                      </Link>
                      {session.userId === currentUserId && <span className={styles.you}>{copy.you}</span>}
                    </div>
                    <p className={styles.task}>{session.task || (isBreak ? copy.break : copy.taskFallback)}</p>
                    <span className={styles.status} data-working={!paused && !isBreak}>
                      {paused ? <Pause size={11} aria-hidden="true" /> : isBreak ? <Coffee size={11} aria-hidden="true" /> : <span className={styles.dot} aria-hidden="true" />}
                      {statusLabel}
                    </span>
                    {!tracking && <progress className={styles.progress} value={elapsed} max={Math.max(1, session.duration * 60)} aria-label={`${copy.progress}: ${identity.displayName}`} />}
                  </div>
                  <div className={styles.timer}>
                    <strong role="timer" aria-live="off">{formatClock(tracking ? elapsed : remaining)}</strong>
                    <span>{tracking ? copy.elapsed : copy.remaining}</span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
