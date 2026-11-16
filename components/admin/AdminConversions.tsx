'use client'

import { useState } from 'react'
import Link from 'next/link'
import { userProfileHref } from '@/lib/userProfile'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { defaultConversionPeriod, isCalendarDate, kyivDate } from '@/lib/conversionPeriod'
import { useAdminData } from './useAdminData'

type ConversionRow = {
  id: string; kind: 'visitor' | 'anonymous' | 'registered'; username: string | null
  ipAddress: string | null; pagePath: string | null; referrer: string | null
  createdAt: string; lastSeenAt: string | null; active: boolean
}
type Conversions = {
  rows: ConversionRow[]; total: number; page: number; pageSize: number
  start: string; end: string; visitors: number; newVisitors: number; anonymous: number; registered: number
  profiles: number; active: number; pending: number; referrers: string[]
  visitToAnonymous: number | null; anonymousToRegistered: number | null
  visitToRegistered: number | null; activeConversion: number | null
  updatedAt: string
}
const count = (value?: number) => value === undefined ? '—' : value.toLocaleString('en-US')
const percent = (value?: number | null) => value === null || value === undefined ? '—' : `${value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
const timestamp = (value: string | null) => value
  ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
const kindLabel = { visitor: 'New visitor', anonymous: 'Anonymous', registered: 'Registered' }
const dateLabel = (value: string) => isCalendarDate(value)
  ? new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', dateStyle: 'medium' }).format(new Date(`${value}T00:00:00Z`)) : 'Choose a date'

function PeriodPicker({ start, end, today, onApply, onReset }: {
  start: string; end: string; today: string; onApply: (start: string, end: string) => void; onReset: () => void
}) {
  const [from, setFrom] = useState(start)
  const [to, setTo] = useState(end)
  const valid = isCalendarDate(from) && isCalendarDate(to) && from <= to && to <= today
  return <form noValidate className="admin-data-filters admin-conversion-range" aria-label="Visitor and account creation period" onSubmit={event => {
    event.preventDefault()
    if (valid) onApply(from, to)
  }}>
    <label htmlFor="conversion-start">Created from<input id="conversion-start" type="date" min="0001-01-01" max={today} value={from} onChange={event => setFrom(event.target.value)} aria-describedby="conversion-range-help" /></label>
    <label htmlFor="conversion-end">Through<input id="conversion-end" type="date" min={isCalendarDate(from) ? from : '0001-01-01'} max={today} value={to} onChange={event => setTo(event.target.value)} aria-describedby="conversion-range-help" /></label>
    <button type="submit" disabled={!valid}>Apply period</button>
    <button type="button" onClick={onReset}>Last 7 full days</button>
    <p id="conversion-range-help" className="admin-data-note">{valid ? 'Inclusive calendar dates in Kyiv. Today is excluded by default.' : 'Choose both dates, with the end on or after the start and no later than today.'}</p>
  </form>
}

export default function AdminConversions() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const defaults = defaultConversionPeriod()
  const start = params.get('conversionStart') ?? defaults.start
  const end = params.get('conversionEnd') ?? defaults.end
  const today = kyivDate()
  const valid = isCalendarDate(start) && isCalendarDate(end) && start <= end && end <= today
  const referrer = params.get('conversionReferrer') ?? ''
  const rawPage = Number(params.get('conversionPage') ?? 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const query = new URLSearchParams({ start, end, referrer, page: String(page) })
  const { data, loading, error, refresh } = useAdminData<Conversions>(`/api/admin/conversions?${query}`, undefined, valid)
  function navigate(from?: string, through?: string) {
    const next = new URLSearchParams(params.toString())
    next.delete('conversionPage')
    if (from && through) { next.set('conversionStart', from); next.set('conversionEnd', through) }
    else { next.delete('conversionStart'); next.delete('conversionEnd') }
    router.replace(`${pathname}?${next}#conversions`, { scroll: false })
  }
  function selectReferrer(value: string) {
    const next = new URLSearchParams(params.toString())
    next.delete('conversionPage')
    if (value) next.set('conversionReferrer', value)
    else next.delete('conversionReferrer')
    router.replace(`${pathname}?${next}#conversions`, { scroll: false })
  }
  function selectPage(value: number) {
    const next = new URLSearchParams(params.toString())
    // Keep the displayed default period stable when a pagination URL is shared.
    next.set('conversionStart', start)
    next.set('conversionEnd', end)
    next.set('conversionPage', String(value))
    router.replace(`${pathname}?${next}#conversions`, { scroll: false })
  }
  const referrers = Array.from(new Set([...(referrer && referrer !== '__none__' ? [referrer] : []), ...(data?.referrers ?? [])]))
  const stages = [
    { label: 'All visitors', value: data?.visitors, rate: null, note: `New visitors + anonymous + registered. Still without a profile: ${count(data?.newVisitors)}.` },
    { label: 'Reached anonymous stage', value: data?.profiles, rate: data?.visitToAnonymous, note: `Anonymous + registered profiles. Currently anonymous: ${count(data?.anonymous)}. Registered profiles remain included in this stage.` },
    { label: 'Registered users', value: data?.registered, rate: data?.anonymousToRegistered, note: 'Registered ÷ (anonymous + registered) profiles.' },
  ]
  return <section className="admin-conversions" aria-label="Visitor conversions">
    <div className="admin-data-toolbar"><div><h2>{dateLabel(start)} – {dateLabel(end)}</h2><p>Current visitor and account records created in this period. Status and last activity are evaluated through now.</p></div><button type="button" disabled={loading || !valid} onClick={refresh}>Refresh</button></div>
    <PeriodPicker key={`${start}:${end}`} start={start} end={end} today={today} onApply={navigate} onReset={() => navigate()} />
    <div className="admin-data-filters admin-referrer-filter">
      <label htmlFor="conversion-referrer">Referrer</label>
      <select id="conversion-referrer" value={referrer} onChange={event => selectReferrer(event.target.value)} aria-describedby="conversion-referrer-help">
        <option value="">All referrers</option>
        <option value="__none__">Direct / unknown referrer</option>
        {referrers.map(value => <option key={value} value={value}>{value}</option>)}
      </select>
    </div>
    <p id="conversion-referrer-help" className="admin-data-note admin-conversion-filter-note">With a referrer filter, accounts created before 15 Nov 2026 are included regardless of referrer. New visitors are always filtered by source.</p>
    {(!valid || error) && <p role="alert" className="admin-data-error">{error ?? 'The URL contains an invalid date range. Choose another period.'}{error && ' Use Refresh to try again.'}</p>}
    <div aria-busy={loading}>
      <section className="admin-conversion-active" aria-labelledby="conversion-active-heading">
        <div><p className="admin-eyebrow">PRIMARY CONVERSION</p><h2 id="conversion-active-heading">Active after 24 hours</h2><p>Last seen at least 24 hours after the profile was created. A long visit and a return visit both qualify.</p></div>
        <div className="admin-conversion-active-value"><strong>{percent(data?.activeConversion)}</strong><span>{count(data?.active)} of {count(data?.visitors)} visitors became active</span></div>
        <p className="admin-data-note">Active anonymous and registered users ÷ all visitors in the selected group. New visitors have no last-seen timestamp and do not contribute to the active count.</p>
        {data && data.pending > 0 && <p className="admin-data-note">{count(data.pending)} profiles have not reached 24 hours yet and remain in the denominator. Their result is still pending.</p>}
      </section>
      <ol className="admin-conversion-funnel" aria-label="Visit to registration funnel">{stages.map((stage, index) => <li className="admin-metric" key={stage.label}>
        <h3 className="admin-metric-label">{stage.label}</h3><strong>{count(stage.value)}</strong>
        {index > 0 && <p className="admin-conversion-rate">{percent(stage.rate)} <span>{index === 1 ? 'visit → anonymous' : 'anonymous → registered'}</span></p>}
        <p className="admin-metric-note">{stage.note}</p>
      </li>)}</ol>
      <div className="admin-conversion-summary"><p><strong>{percent(data?.visitToRegistered)}</strong> visit → registered · {count(data?.registered)} / {count(data?.visitors)}</p></div>
    </div>
    <p className="admin-data-note" role="status">{loading ? 'Loading conversions…' : data?.visitors === 0 ? 'No visitor or account records in this period. Conversion rates are unavailable.' : data ? `Updated ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.updatedAt))} · Kyiv time` : 'Conversions unavailable.'}</p>
    <section aria-labelledby="conversion-records-heading" className="admin-conversion-records">
      <div className="admin-data-toolbar"><div><h2 id="conversion-records-heading">All visitors and users{data ? ` · ${count(data.total)}` : ''}</h2><p>New visitors, anonymous and registered users together. Newest first, using the period and referrer filters above.</p></div></div>
      <div className="admin-data-frame" aria-busy={loading}>
        {loading ? <p className="admin-data-state" role="status">Loading visitors and users…</p> : data ? <>
          <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="All conversion records table">
            <table><caption className="sr-only">New visitors, anonymous profiles and registered users in the selected group</caption>
              <thead><tr>{['User / visitor', 'Type', 'Created · Kyiv', 'Last seen · Kyiv', 'Active after 24h', 'Referrer', 'Landing page'].map(title => <th key={title} scope="col">{title}</th>)}</tr></thead>
              <tbody>{data.rows.length === 0 ? <tr><td colSpan={7} className="admin-data-state">No visitors or users match these filters.</td></tr> : data.rows.map(row => <tr key={`${row.kind}:${row.id}`}>
                <td>{row.kind === 'visitor' ? <div className="admin-person-link">{row.ipAddress || 'Unknown IP'}<small>{row.id}</small></div> : <Link className="admin-person-link" href={userProfileHref({ id: row.id, username: row.username ?? '', isAnonymous: row.kind === 'anonymous' })}>{row.username || row.id}<small>{row.id}</small></Link>}</td>
                <td>{kindLabel[row.kind]}</td><td>{timestamp(row.createdAt)}</td><td>{timestamp(row.lastSeenAt)}</td>
                <td>{row.kind === 'visitor' ? 'Not recorded' : row.active ? 'Yes' : 'No'}</td>
                <td className="admin-message-cell">{row.referrer || '—'}</td><td className="admin-message-cell">{row.pagePath || '—'}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <nav className="admin-data-pagination" aria-label="Conversion records pages"><span>{data.total ? (data.page - 1) * data.pageSize + 1 : 0}–{Math.min(data.page * data.pageSize, data.total)} of {count(data.total)} · Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><div><button type="button" disabled={data.page <= 1} onClick={() => selectPage(data.page - 1)}>Previous</button><button type="button" disabled={data.page * data.pageSize >= data.total} onClick={() => selectPage(data.page + 1)}>Next</button></div></nav>
        </> : <p className="admin-data-state">{valid ? 'Use Refresh above to retry loading visitors and users.' : 'Choose a valid period to load visitors and users.'}</p>}
      </div>
    </section>
    <div className="admin-conversion-method"><h3>How this is counted</h3><p>All visitors = New visitors + current anonymous users + registered users. The anonymous stage includes both anonymous and registered profiles, so upgrading an account does not remove it from that stage.</p><p>The period filters each record by its creation date in Kyiv time. Registration keeps the original anonymous profile creation date. Counts use current records and status, not historical transition dates; deleted records are excluded.</p><p>Active means lastSeenAt is at least 24 elapsed hours after createdAt. The last activity can be after the selected period. Empty groups show no percentage.</p><p>Referrer filtering applies to New visitors for every date and to accounts created from 15 Nov 2026 onward. Older accounts are included without checking their referrer. With All referrers, no source restriction applies.</p></div>
  </section>
}
