'use client'

import AdminOverview from './AdminOverview'
import { useAdminData } from './useAdminData'

type MetricRecord = { period: string; count: number } | null
type Metrics = { totalRegistered: number; registrationMonth: MetricRecord; registrationDay: MetricRecord; timerDay: MetricRecord; timerUsersDay: MetricRecord; updatedAt: string }

function formatPeriod(period: string) {
  const monthly = period.length === 7
  // Period strings already represent Kyiv calendar dates; avoid another zone shift.
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', year: 'numeric', month: 'long', ...(monthly ? {} : { day: 'numeric' as const }) }).format(new Date(`${period}${monthly ? '-01' : ''}T00:00:00Z`))
}

export default function AdminAllMetrics() {
  const { data, error, loading, refresh } = useAdminData<Metrics>('/api/admin/metrics')
  const records = [
    { label: 'Best month for registrations', record: data?.registrationMonth, unit: 'registered accounts' },
    { label: 'Best day for registrations', record: data?.registrationDay, unit: 'registered accounts' },
    { label: 'Best day for timer starts', record: data?.timerDay, unit: 'sessions started' },
    { label: 'Best day for timer users', record: data?.timerUsersDay, unit: 'unique accounts starting a timer' },
  ]
  return <>
    <section className="admin-records" aria-label="All-time records" aria-busy={loading}>
      <div className="admin-data-toolbar"><div><h2>All-time records</h2><p>Calendar dates in Kyiv · Most recent period wins a tie.</p></div><button type="button" onClick={refresh} disabled={loading}>{loading ? 'Loading…' : 'Refresh records'}</button></div>
      {error && <p role="alert" className="admin-data-error">{error}</p>}
      <div className="admin-total-registered"><div><h3>Total registered users</h3><p>All current registered accounts · Guests excluded</p></div><strong>{data?.totalRegistered.toLocaleString('en-US') ?? '—'}</strong></div>
      <div className="admin-metrics">{records.map(({ label, record, unit }) => <div className="admin-metric" key={label}>
        <h3 className="admin-metric-label">{label}</h3>
        <strong>{record ? record.count.toLocaleString('en-US') : '—'}</strong>
        <p className="admin-record-date">{record ? formatPeriod(record.period) : data ? 'No records yet' : loading ? 'Loading…' : 'Unavailable'}</p>
        <p className="admin-metric-note">{unit}</p>
      </div>)}</div>
      <p className="admin-data-note">Registrations use account creation dates. Timer records include all session types and registered or guest accounts; each account counts once per day in the unique-user record.</p>
    </section>
    <AdminOverview showOnlinePanel={false} />
  </>
}
