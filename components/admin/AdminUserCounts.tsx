'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAdminData } from './useAdminData'

type UserCounts = { month: string; registered: number; anonymous: number; total: number; updatedAt: string }

export default function AdminUserCounts() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const today = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', timeZone: 'Europe/Kyiv' }).formatToParts(new Date())
  const currentMonth = `${today.find(part => part.type === 'year')!.value}-${today.find(part => part.type === 'month')!.value}`
  const selected = params.get('usersMonth') ?? currentMonth
  const month = selected === 'all' || /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(selected) ? selected : currentMonth
  const { data, loading, error, refresh } = useAdminData<UserCounts>(`/api/admin/user-counts?month=${month}`)
  const period = month === 'all' ? 'All time' : new Intl.DateTimeFormat('en-GB', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${month}-01T00:00:00Z`))

  function selectMonth(value: string) {
    const next = new URLSearchParams(params.toString())
    next.set('usersMonth', value || 'all')
    router.replace(`${pathname}?${next}#user-counts`, { scroll: false })
  }

  function moveMonth(offset: number) {
    const [year, number] = (month === 'all' ? currentMonth : month).split('-').map(Number)
    const index = year * 12 + number - 1 + offset
    if (index < 12 || index > 9999 * 12 + 11) return
    selectMonth(`${String(Math.floor(index / 12)).padStart(4, '0')}-${String(index % 12 + 1).padStart(2, '0')}`)
  }

  const metrics = [
    { label: 'Registered users', value: data?.registered.toLocaleString('en-US'), note: 'Accounts with registration' },
    { label: 'Anonymous users', value: data?.anonymous.toLocaleString('en-US'), note: 'Guest accounts' },
    { label: 'Total users', value: data?.total.toLocaleString('en-US'), note: 'Registered + anonymous accounts' },
    {
      label: 'Registration conversion',
      value: data && data.total > 0 ? (data.registered / data.total).toLocaleString('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }) : undefined,
      note: 'Registered ÷ total users × 100%',
    },
  ]

  return <section className="admin-statistics admin-user-counts" aria-label="User counts">
    <div className="admin-data-toolbar">
      <div><h2>{period}</h2><p>Accounts created during the selected period.</p></div>
      <button type="button" onClick={refresh} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
    </div>
    <div className="admin-data-filters admin-user-counts-period" role="group" aria-label="Account creation period">
      <label htmlFor="admin-users-month">Month</label>
      <div className="admin-user-counts-month-nav">
        <button type="button" aria-label="Previous month" title="Previous month" disabled={month === '0001-01'} onClick={() => moveMonth(-1)}><ChevronLeft size={18} aria-hidden="true" /></button>
        <input id="admin-users-month" type="month" min="0001-01" max="9999-12" value={month === 'all' ? '' : month} onChange={event => selectMonth(event.target.value)} />
        <button type="button" aria-label="Next month" title="Next month" disabled={month === '9999-12'} onClick={() => moveMonth(1)}><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
      <button type="button" aria-pressed={month === 'all'} onClick={() => selectMonth('all')}>All time</button>
    </div>
    {error && <p role="alert" className="admin-data-error">{error} Use Refresh to try again.</p>}
    <div className="admin-metrics" aria-busy={loading}>
      {metrics.map(({ label, value, note }) => <div className="admin-metric" key={label}>
        <h3 className="admin-metric-label">{label}</h3>
        <strong>{value ?? '—'}</strong>
        <p className="admin-metric-note">{note}</p>
      </div>)}
    </div>
    <p className="admin-data-note" role="status">{loading ? 'Loading user counts…' : data?.total === 0 ? 'No accounts were created during this period.' : data ? `${data.total.toLocaleString('en-US')} accounts · ${period}` : 'User counts unavailable.'}</p>
    <p className="admin-data-note">Counts use existing accounts and their current registered or anonymous status. Deleted accounts and visitors without an account are excluded. Months follow Kyiv time.</p>
    <p className="admin-data-note">Conversion is the share of currently registered accounts among all accounts created in this period. It does not measure visits that led to registration. With no accounts, conversion is unavailable.</p>
  </section>
}
