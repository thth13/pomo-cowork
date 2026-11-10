'use client'

import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Clock, Pause } from 'lucide-react'
import { userProfileHref } from '@/lib/userProfile'
import { useI18n } from '@/components/I18nProvider'
import { communityCopy } from '@/lib/i18n/community'
import { useConnectionStore } from '@/store/useConnectionStore'
import { useTimerStore } from '@/store/useTimerStore'
import { SessionStatus, SessionType, type ActiveSession, type RoomMember } from '@/types'

function StatusBadge({ tone = 'idle', children }: { tone?: 'idle' | 'online' | 'working' | 'paused'; children: ReactNode }) {
  return <span className="room-presence-status" data-tone={tone}><span className="room-presence-dot" aria-hidden="true" />{children}</span>
}

export function RoomOnlineCount({ members }: { members: RoomMember[] }) {
  const { language } = useI18n()
  const copy = communityCopy[language]
  const onlineUserIds = useConnectionStore(state => state.onlineUserIds)
  const isConnected = useConnectionStore(state => state.isConnected)
  const isChecking = useConnectionStore(state => state.isChecking)
  const onlineCount = new Set(members.filter(member => onlineUserIds[member.user.id]).map(member => member.user.id)).size

  return <span className="community-badge" role="status">
    <StatusBadge tone={isConnected ? 'online' : 'idle'}>{isConnected ? `${onlineCount} ${copy.online.toLocaleLowerCase(language)}` : isChecking ? copy.presenceChecking : copy.presenceUnavailable}</StatusBadge>
  </span>
}

const hasVisibleTimer = (session: ActiveSession, now: number) =>
  session.timeRemaining > 0 && (session.status === undefined || session.status === SessionStatus.ACTIVE || session.status === SessionStatus.PAUSED) &&
  (session.status === SessionStatus.PAUSED || new Date(session.startedAt).getTime() + session.duration * 60000 > now)

export function RoomParticipants({ members, children }: { members: RoomMember[]; children: (member: RoomMember) => ReactNode }) {
  const onlineUserIds = useConnectionStore(state => state.onlineUserIds)
  const isConnected = useConnectionStore(state => state.isConnected)
  const sessions = useTimerStore(state => state.activeSessions)
  const [now, setNow] = useState(Date.now)
  const { sortedMembers, nextExpiry } = useMemo(() => {
    const memberIds = new Set(members.map(member => member.user.id))
    const timerUserIds = new Set<string>()
    let nextExpiry = Infinity
    for (const session of sessions) {
      if (!isConnected || !memberIds.has(session.userId) || !onlineUserIds[session.userId] || !hasVisibleTimer(session, now)) continue
      timerUserIds.add(session.userId)
      if (session.status !== SessionStatus.PAUSED) {
        nextExpiry = Math.min(nextExpiry, new Date(session.startedAt).getTime() + session.duration * 60000)
      }
    }
    const priority = (member: RoomMember) => !isConnected || !onlineUserIds[member.user.id] ? 2 : timerUserIds.has(member.user.id) ? 0 : 1
    return { sortedMembers: [...members].sort((a, b) => priority(a) - priority(b)), nextExpiry }
  }, [members, sessions, onlineUserIds, isConnected, now])

  useEffect(() => {
    const refresh = () => setNow(Date.now())
    refresh()
    const timeout = Number.isFinite(nextExpiry)
      ? window.setTimeout(refresh, Math.min(Math.max(0, nextExpiry - Date.now()) + 50, 2147483647))
      : undefined
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [nextExpiry])

  return <>{sortedMembers.map(member => <Fragment key={member.id}>{children(member)}</Fragment>)}</>
}

const formatTimer = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const remainder = total % 60
  return `${hours > 0 ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

export function RoomParticipant({ member, avatar, actions }: { member: RoomMember; avatar: ReactNode; actions?: ReactNode }) {
  const { language } = useI18n()
  const copy = communityCopy[language]
  const isConnected = useConnectionStore(state => state.isConnected)
  const isChecking = useConnectionStore(state => state.isChecking)
  const isOnline = useConnectionStore(state => state.onlineUserIds[member.user.id] === true)
  const session = useTimerStore(state => state.activeSessions.find(item => item.userId === member.user.id && (item.status === undefined || item.status === SessionStatus.ACTIVE || item.status === SessionStatus.PAUSED)))
  const [now, setNow] = useState(Date.now)
  const isPaused = session?.status === SessionStatus.PAUSED
  const expiresAt = session ? new Date(session.startedAt).getTime() + session.duration * 60000 : 0
  const shouldTick = Boolean(isConnected && isOnline && session && !isPaused && expiresAt > now && session.timeRemaining > 0)

  useEffect(() => {
    const refresh = () => setNow(Date.now())
    refresh()
    const interval = shouldTick ? window.setInterval(refresh, 1000) : undefined
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [shouldTick, expiresAt])

  const activeSession = isConnected && isOnline && session && hasVisibleTimer(session, now) ? session : null
  const isWorking = Boolean(activeSession && !isPaused && (activeSession.type === SessionType.WORK || activeSession.type === SessionType.TIME_TRACKING))
  const presenceLabel = !isConnected ? isChecking ? copy.presenceChecking : copy.presenceUnavailable : isOnline ? copy.online : copy.offline
  const activityLabel = !isConnected ? isChecking ? copy.presenceChecking : copy.presenceUnavailable : !activeSession ? copy.notWorking : isPaused ? copy.paused : isWorking ? copy.working : activeSession.type === SessionType.LONG_BREAK ? copy.longBreak : copy.shortBreak
  const remaining = activeSession ? isPaused ? activeSession.timeRemaining : Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0
  const isTracking = activeSession?.type === SessionType.TIME_TRACKING
  const timerSeconds = activeSession && isTracking ? Math.max(0, activeSession.duration * 60 - remaining) : remaining

  return <div className="community-person room-participant" data-working={isWorking}>
    <Link href={userProfileHref(member.user)} className="community-person-link room-participant-link">
      {avatar}
      <span className="community-person-copy">
        <strong className="room-participant-name"><span>{member.user.username}</span><span className="room-participant-online" data-online={isConnected && isOnline} role="img" aria-label={presenceLabel} title={presenceLabel} /></strong>
        <small className="room-participant-activity">{activityLabel}</small>
      </span>
      {activeSession && <span className="room-participant-timer">
        <span className="room-participant-timer-label">{isPaused ? <Pause size={12} aria-hidden="true" /> : <Clock size={12} aria-hidden="true" />}{isTracking ? copy.elapsedTime : copy.focusRemaining}</span>
        <span className="room-participant-time" role="timer" aria-live="off">{formatTimer(timerSeconds)}</span>
      </span>}
    </Link>
    {actions}
  </div>
}
