'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import useSWRInfinite from 'swr/infinite'
import { Bell, Check, Mail, Trophy, CalendarDays, Crown } from 'lucide-react'
import Navbar from '@/components/Navbar'
import PersonalNavigation from '@/components/PersonalNavigation'
import AuthModal from '@/components/AuthModal'
import { useAuthStore } from '@/store/useAuthStore'
import { useI18n } from '@/components/I18nProvider'
import { notificationsCopy } from '@/lib/i18n/notifications'
import { monthLabel } from '@/lib/wrapped/analytics'
import type { NotificationItem } from '@/types'
import './notifications.css'

interface HistoryPage {
  notifications: NotificationItem[]
  nextCursor: string | null
}

class NotificationError extends Error {
  constructor(public status: number) { super('Notification request failed') }
}

async function fetchHistory([url, token]: [string, string]): Promise<HistoryPage> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' })
    if (!response.ok) throw new NotificationError(response.status)
    return await response.json()
  } finally {
    window.clearTimeout(timeout)
  }
}

const icons = { ROOM_INVITE: Mail, WALL_MESSAGE: Mail, RANK_UP: Trophy, MONTHLY_WRAPPED: CalendarDays, PREMIUM_GRANTED: Crown }

export default function NotificationsHistory() {
  const { token, isAuthenticated, isLoading: authLoading } = useAuthStore()
  const { language } = useI18n()
  const copy = notificationsCopy[language]
  const [authOpen, setAuthOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<{ id: string; status?: number; token: string | null } | null>(null)
  const mutationLock = useRef(false)
  const { data, error, size, setSize, isValidating, mutate } = useSWRInfinite<HistoryPage, NotificationError>(
    (index: number, previous: HistoryPage | null): [string, string] | null => {
      if (!isAuthenticated || !token || (index > 0 && !previous?.nextCursor)) return null
      const cursor = index > 0 ? previous?.nextCursor : null
      return [`/api/notifications?scope=all${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, token]
    },
    fetchHistory,
    { shouldRetryOnError: false, keepPreviousData: false, persistSize: false },
  )
  const items = Array.from(new Map((data ?? []).flatMap(page => page.notifications).map(item => [item.id, item])).values())
  const hasMore = Boolean(data?.[data.length - 1]?.nextCursor)
  const loading = isAuthenticated && token && !data && !error
  const expired = error?.status === 401 || (actionError?.token === token && actionError?.status === 401)
  const formatDate = (value: string) => new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-US', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(value))

  useEffect(() => {
    if (!isAuthenticated || !token) return
    const refresh = () => { void mutate() }
    window.addEventListener('notifications-updated', refresh)
    return () => window.removeEventListener('notifications-updated', refresh)
  }, [isAuthenticated, token, mutate])

  async function update(notification: NotificationItem, action: 'read' | 'accept' | 'decline') {
    if (!token || mutationLock.current) return
    mutationLock.current = true
    setBusy(notification.id)
    setActionError(null)
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 20_000)
    try {
      const response = await fetch(action === 'read' ? `/api/notifications/${notification.id}` : `/api/room-invites/${notification.roomInviteId}/${action}`, {
        method: action === 'read' ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(action === 'read' ? { body: JSON.stringify({ read: true }) } : {}),
        signal: controller.signal,
      })
      if (!response.ok) throw new NotificationError(response.status)
      if (useAuthStore.getState().token !== token) return
      const readAt = new Date().toISOString()
      await mutate(pages => pages?.map(page => ({
        ...page,
        notifications: page.notifications.map((item): NotificationItem => {
          const matches = item.id === notification.id || (action !== 'read' && item.roomInviteId === notification.roomInviteId)
          if (!matches) return item
          return {
            ...item,
            readAt: item.readAt ?? readAt,
            roomInvite: item.roomInvite && action !== 'read'
              ? { ...item.roomInvite, status: action === 'accept' ? 'ACCEPTED' : 'DECLINED' }
              : item.roomInvite,
          }
        }),
      })), { revalidate: false })
      window.dispatchEvent(new Event('notifications-updated'))
    } catch (failure) {
      if (useAuthStore.getState().token === token) {
        setActionError({ id: notification.id, status: failure instanceof NotificationError ? failure.status : undefined, token })
        // Refresh resolved/expired invitations before allowing another attempt.
        void mutate()
      }
    } finally {
      window.clearTimeout(timeout)
      mutationLock.current = false
      setBusy(null)
    }
  }

  return <div className="garden-page notifications-page" data-i18n-ignore>
    <Navbar compact />
    <main className="notifications-history personal-page-frame">
      <PersonalNavigation />
      <header className="notifications-history-heading">
        <Bell size={24} aria-hidden="true" />
        <h1>{copy.title}</h1>
      </header>
      {authLoading || loading ? <div className="notifications-history-state" role="status">{copy.loading}</div>
        : !isAuthenticated || !token ? <div className="notifications-history-state">
          <p>{copy.signInHint}</p><button className="btn" onClick={() => setAuthOpen(true)}>{copy.signIn}</button>
        </div> : <>
          {expired && <div className="notifications-history-error" role="alert"><p>{copy.expired}</p><button className="btn" onClick={() => setAuthOpen(true)}>{copy.signIn}</button></div>}
          {error && !expired && <div className="notifications-history-error" role="alert"><p>{copy.error}</p><button className="btn" disabled={isValidating} onClick={() => void mutate()}>{copy.retry}</button></div>}
          {!error && data && items.length === 0 && <div className="notifications-history-state"><Bell size={28} aria-hidden="true" /><h2>{copy.empty}</h2><p>{copy.emptyHint}</p></div>}
          {items.length > 0 && <>
            <ol className="notifications-history-list">
              {items.map(item => {
                const Icon = icons[item.type] ?? Bell
                const pendingInvite = item.type === 'ROOM_INVITE' && item.roomInvite?.status === 'PENDING'
                return <li key={item.id} className={`notification-entry notification-entry--${item.type.toLowerCase()}${item.readAt ? '' : ' notification-entry--unread'}`}>
                  <article aria-labelledby={`notification-${item.id}`} aria-busy={busy === item.id}>
                    <span className="sr-only">{item.readAt ? copy.read : copy.unread}</span>
                    <div className="notifications-history-meta">
                      <div className="notifications-history-title">
                        <h2 id={`notification-${item.id}`}>{item.title}</h2>
                        <span className="notifications-history-badge"><Icon size={13} aria-hidden="true" />{copy.types[item.type]}</span>
                      </div>
                      <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                    </div>
                    <p className="notifications-history-message">{item.message}</p>
                    {item.roomInvite && <dl className="notifications-history-details"><div><dt>{copy.room}</dt><dd>{item.roomInvite.room.name}</dd></div><div><dt>{copy.from}</dt><dd>{item.roomInvite.inviter.username}</dd></div><div><dt>{copy.types.ROOM_INVITE}</dt><dd>{copy.statuses[item.roomInvite.status]}</dd></div></dl>}
                    {item.wallMessage && <p className="notifications-history-detail">{copy.from}: <strong>{item.wallMessage.author.username}</strong></p>}
                    {item.wrappedMonth && <p className="notifications-history-detail"><strong>{monthLabel({ monthStart: item.wrappedMonth }, language)}</strong></p>}
                    <div className="notifications-history-actions">
                      {pendingInvite && <><button className="notification-invite-action notification-invite-accept" disabled={busy !== null || expired} onClick={() => void update(item, 'accept')}>{copy.accept}</button><button className="notification-invite-action notification-invite-decline" disabled={busy !== null || expired} onClick={() => void update(item, 'decline')}>{copy.decline}</button></>}
                      {item.roomInvite?.status === 'ACCEPTED' && <Link href={`/rooms/${item.roomInvite.roomId}`} prefetch={false}>{copy.openRoom} →</Link>}
                      {item.type === 'MONTHLY_WRAPPED' && item.wrappedMonth && <button type="button" className="notification-invite-action notification-invite-accept notifications-history-recap" onClick={() => window.dispatchEvent(new CustomEvent('open-monthly-wrapped', { detail: item.wrappedMonth }))}><CalendarDays size={16} aria-hidden="true" />{copy.openRecap}</button>}
                      {!item.readAt && !pendingInvite && <button className="notification-invite-action notification-invite-decline" disabled={busy !== null || expired} onClick={() => void update(item, 'read')}><Check size={14} aria-hidden="true" />{copy.markRead}</button>}
                      {busy === item.id && <span role="status">{copy.working}</span>}
                    </div>
                    {actionError?.id === item.id && actionError.token === token && !expired && <p className="notifications-history-error" role="alert">{copy.actionError}</p>}
                  </article>
                </li>
              })}
            </ol>
            {hasMore && !error && <div className="notifications-history-pagination"><button className="btn" disabled={isValidating} onClick={() => void setSize(size + 1)}>{isValidating ? copy.loading : copy.more}</button></div>}
          </>}
        </>}
    </main>
    <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
  </div>
}
