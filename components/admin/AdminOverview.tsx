'use client'

import { Radio, UserPlus, Users, MousePointer2 } from 'lucide-react'
import { useConnectionStore } from '@/store/useConnectionStore'
import AdminOnlinePanel from './AdminOnlinePanel'
import { useAdminData } from './useAdminData'

type Overview = { todayRegistered: number; todayAnonymous: number; monthlyRegistered: number; todayStartedTimers: number; paywallActions: number; habits: number; activeHabits: number; wallMessages: number; updatedAt: string }

export default function AdminOverview({ showOnlinePanel = true }: { showOnlinePanel?: boolean }) {
  const { data, error, loading, refresh } = useAdminData<Overview>('/api/admin/overview')
  const connected = useConnectionStore(state => state.isConnected)
  const totalOnline = useConnectionStore(state => state.totalOnlineCount)
  const primaryMetrics = [
    { label: 'Currently online', value: connected ? totalOnline : undefined, note: connected ? 'Live · accounts and anonymous visitors' : 'Reconnecting to live presence…', icon: Radio },
    { label: 'Today new users', value: data?.todayRegistered, note: 'Today · Kyiv', href: '#directory', icon: UserPlus },
    { label: 'Today new anonymous users', value: data?.todayAnonymous, note: 'Guest accounts created today · Kyiv', icon: Users },
    { label: 'Paywall activity', value: data?.paywallActions, note: 'All recorded actions', href: '#events', icon: MousePointer2 },
  ]
  const metrics = [
    { label: 'Monthly registered', value: data?.monthlyRegistered, note: 'Current calendar month · Kyiv', href: '#directory' },
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
    <p className="admin-data-note">Registration counts use account creation dates and exclude guest accounts.</p>
  </section>
}
