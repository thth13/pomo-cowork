'use client'

import { useEffect, useState } from 'react'
import { Radio, UserPlus, Users, MousePointer2 } from 'lucide-react'
import { useConnectionStore } from '@/store/useConnectionStore'
import { useTimerStore } from '@/store/useTimerStore'
import { useSocket } from '@/hooks/useSocket'
import { SessionStatus } from '@/types'
import AdminOnlinePanel from './AdminOnlinePanel'
import AdminRecentUsers from './AdminRecentUsers'
import { useAdminData } from './useAdminData'

type Overview = { todayRegistered: number; todayAnonymous: number; monthlyRegistered: number; monthlyUsers: number; todayStartedTimers: number; paywallActions: number; habits: number; activeHabits: number; wallMessages: number; updatedAt: string }

export default function AdminOverview({ showOnlinePanel = true }: { showOnlinePanel?: boolean }) {
  useSocket()
  const { data, error, loading, refresh } = useAdminData<Overview>('/api/admin/overview')
  const connected = useConnectionStore(state => state.isConnected)
  const totalOnline = useConnectionStore(state => state.totalOnlineCount)
  const sessions = useTimerStore(state => state.activeSessions)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])
  const timerUsers = new Set(sessions.filter(session => {
    const status = session.status ?? SessionStatus.ACTIVE
    if (status !== SessionStatus.ACTIVE && status !== SessionStatus.PAUSED) return false
    const duration = (session.duration || 25) * 60
    const remaining = session.timeRemaining ?? duration
    if (status === SessionStatus.PAUSED) return remaining > 0
    const startedAt = new Date(session.startedAt).getTime()
    return Number.isFinite(startedAt) ? duration - Math.floor((now - startedAt) / 1000) > 0 : remaining > 0
  }).map(session => session.userId)).size
  const primaryMetrics = [
    { label: 'Currently online', value: connected ? totalOnline : undefined, note: connected ? 'Live · accounts and anonymous visitors' : 'Reconnecting to live presence…', icon: Radio },
    { label: 'Today new users', value: data?.todayRegistered, note: 'Today · Kyiv', href: '#directory', icon: UserPlus },
    { label: 'Today new anonymous users', value: data?.todayAnonymous, note: 'Guest accounts created today · Kyiv', icon: Users },
    { label: 'Paywall activity', value: data?.paywallActions, note: 'All recorded actions', href: '#events', icon: MousePointer2 },
  ]
  const metrics = [
    { label: 'Online in timer', value: connected ? timerUsers : undefined, note: connected ? 'Live · unique users across all rooms, including paused timers' : 'Reconnecting to live timers…' },
    { label: 'Monthly registered', value: data?.monthlyRegistered, note: 'Registered accounts only · Current month · Kyiv', href: '#directory' },
    { label: 'Monthly total new users', value: data?.monthlyUsers, note: 'Registered and guest accounts · Current month · Kyiv', href: '#directory' },
    { label: 'Today started timers', value: data?.todayStartedTimers, note: 'All sessions, including breaks · Kyiv' },
    { label: 'Habits', value: data?.habits, note: data ? `${data.activeHabits} active · ${data.habits - data.activeHabits} archived` : 'Active and archived', href: '#habits' },
    { label: 'Wall messages', value: data?.wallMessages, note: 'Across all profile walls', href: '#wall' },
  ]
  return <section aria-label="Community statistics" className="admin-statistics" aria-busy={loading}>
    <div className="admin-data-toolbar"><p>{loading ? 'Loading statistics…' : data ? `Updated ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit' }).format(new Date(data.updatedAt))} · Kyiv` : 'Statistics unavailable'}</p><button type="button" onClick={refresh} disabled={loading}>Refresh statistics</button></div>
    {error && <p role="alert" className="admin-data-error">{error}</p>}
    <div className="admin-metrics admin-primary-metrics" aria-label="Key metrics">{primaryMetrics.map(({ icon: Icon, ...metric }) => {
      const content = <><span className="admin-metric-label">{metric.label}<Icon size={20} aria-hidden="true" /></span><strong>{metric.value?.toLocaleString('en-US') ?? '—'}</strong><span className="admin-metric-note">{metric.note}</span></>
      return metric.href ? <a key={metric.label} href={metric.href} className="admin-metric admin-primary-metric">{content}</a> : <div key={metric.label} className="admin-metric admin-primary-metric">{content}</div>
    })}</div>
    {showOnlinePanel && <AdminOnlinePanel />}
    <div className="admin-metrics">{metrics.map(metric => {
      const content = <><span className="admin-metric-label">{metric.label}</span><strong>{metric.value?.toLocaleString('en-US') ?? '—'}</strong><span className="admin-metric-note">{metric.note}</span></>
      return metric.href ? <a key={metric.label} href={metric.href} className="admin-metric">{content}</a> : <div key={metric.label} className="admin-metric">{content}</div>
    })}</div>
    <p className="admin-data-note">New-user counts use account creation dates. The monthly total includes registered and guest accounts; today’s counts are shown separately.</p>
    <AdminRecentUsers />
  </section>
}
