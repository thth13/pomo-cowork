'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { beepTourSteps } from '@/lib/beepEventTypes'
import { userProfileHref } from '@/lib/userProfile'
import { useAdminData } from './useAdminData'

type EventRow = {
  id: string; visitId: string; action: string; surface: string; step: number | null; pagePath: string; createdAt: string; isAuthenticated: boolean
  user: { id: string; username: string; isAnonymous: boolean } | null
}
type Events = { rows: EventRow[]; total: number; page: number; pageSize: number }
const surfaces = { all: 'All', tour: 'Onboarding', welcome: 'Welcome', chat: 'Popup chat', character: 'Character', controls: 'Controls', page: 'Saved chat' }
const label = (value: string) => value.replace(/_/g, ' ')
const date = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value))

export default function AdminBeepEvents() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const rawPage = Number(params.get('beepEventsPage') ?? 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const rawSurface = params.get('beepSurface') ?? 'all'
  const surface = Object.hasOwn(surfaces, rawSurface) ? rawSurface as keyof typeof surfaces : 'all'
  const visitId = params.get('beepVisit') || null
  const { data, loading, error, refresh } = useAdminData<Events>('/api/admin/beep-events', JSON.stringify({ page, surface, visitId }))
  function navigate(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString())
    Object.entries(changes).forEach(([key, value]) => { if (value === null) next.delete(key); else next.set(key, value) })
    router.replace(`${pathname}?${next}#beep-events`, { scroll: false })
  }
  return <section aria-label="Beep activity">
    <div className="admin-data-toolbar"><div><h2>Beep activity{data ? ` · ${data.total.toLocaleString('en-US')} events` : ''}</h2><p>Button presses, newest first. Times are shown in Kyiv time.</p></div><button type="button" disabled={loading} onClick={refresh}>Refresh</button></div>
    <p className="admin-data-note admin-beep-note">Onboarding includes Next, Skip, Finish, Close and highlighted controls. Visit groups actions from the same page session, including unsigned guests. Message text and field values are not logged.</p>
    <div className="admin-data-filters admin-beep-filters" role="group" aria-label="Beep interaction area">{Object.entries(surfaces).map(([value, title]) => <button key={value} type="button" aria-pressed={surface === value} onClick={() => navigate({ beepSurface: value === 'all' ? null : value, beepEventsPage: null })}>{title}</button>)}</div>
    {visitId && <div className="admin-data-toolbar"><p className="admin-beep-id">Visit: {visitId}</p><button type="button" onClick={() => navigate({ beepVisit: null, beepEventsPage: null })}>Show all visits</button></div>}
    {error && <p role="alert" className="admin-data-error">{error}</p>}
    <div className="admin-data-frame" aria-busy={loading}>
      {loading ? <p className="admin-data-state" role="status">Loading Beep activity…</p> : data ? <>
        <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Beep activity table"><table>
          <caption className="sr-only">Beep interaction events, including onboarding steps and visits</caption>
          <thead><tr>{['User', 'Action', 'Area / step', 'Page', 'Visit', 'Time · Kyiv'].map(title => <th key={title} scope="col">{title}</th>)}</tr></thead>
          <tbody>{data.rows.length === 0 ? <tr><td colSpan={6} className="admin-data-state">No Beep activity{surface !== 'all' || visitId ? ' matches these filters' : ' recorded yet'}.</td></tr> : data.rows.map(row => <tr key={row.id}>
            <td>{row.user ? <Link className="admin-person-link" href={userProfileHref(row.user)}>{row.user.username}<small>{row.isAuthenticated ? 'Registered account' : 'Guest account'}</small></Link> : 'Unsigned guest'}</td>
            <td>{label(row.action)}</td><td>{surfaces[row.surface as keyof typeof surfaces] ?? row.surface}{row.step !== null && <p className="admin-data-note">{row.step + 1}. {label(beepTourSteps[row.step] ?? 'unknown')}</p>}</td>
            <td className="admin-beep-id">{row.pagePath}</td><td><button type="button" className="admin-beep-link admin-beep-id" onClick={() => navigate({ beepVisit: row.visitId, beepEventsPage: null })}>{row.visitId}</button></td><td>{date(row.createdAt)}</td>
          </tr>)}</tbody>
        </table></div>
        <nav className="admin-data-pagination" aria-label="Beep activity pages"><span>{data.total ? (data.page - 1) * data.pageSize + 1 : 0}–{Math.min(data.page * data.pageSize, data.total)} of {data.total} events · Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><div><button type="button" disabled={data.page <= 1} onClick={() => navigate({ beepEventsPage: String(data.page - 1) })}>Previous</button><button type="button" disabled={data.page * data.pageSize >= data.total} onClick={() => navigate({ beepEventsPage: String(data.page + 1) })}>Next</button></div></nav>
      </> : <p className="admin-data-state">Use Refresh to try loading activity again.</p>}
    </div>
  </section>
}
