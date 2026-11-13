'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { userProfileHref } from '@/lib/userProfile'
import { useAdminData } from './useAdminData'

type Changes = {
  rows: { id: string; field: string; previousValue: boolean; nextValue: boolean; createdAt: string
    user: { id: string; username: string; displayName: string | null } }[]
  total: number; page: number; pageSize: number
}
const labels: Record<string, string> = { minimalTimer: 'Minimal timer', offline: 'Work offline', hideRoomSwitch: 'Hide room selector' }
const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', dateStyle: 'medium', timeStyle: 'medium' })

export default function AdminSettingsChanges() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const value = Number(params.get('settingsChangesPage') ?? 1)
  const page = Number.isSafeInteger(value) && value > 0 ? value : 1
  const { data, loading, error, refresh } = useAdminData<Changes>(`/api/admin/settings-changes?page=${page}`)
  const navigate = (nextPage: number) => {
    const next = new URLSearchParams(params.toString())
    next.set('settingsChangesPage', String(nextPage))
    router.replace(`${pathname}?${next}#settings-changes`, { scroll: false })
  }
  return <section aria-label="Workspace settings changes">
    <div className="admin-data-toolbar">
      <div><h2>Settings changes{data ? ` · ${data.total.toLocaleString('en-US')}` : ''}</h2>
        <p>Minimal timer, Work offline and Hide room selector. Newest first; Kyiv time.</p></div>
      <button type="button" onClick={refresh} disabled={loading}>Refresh</button>
    </div>
    {error && <p role="alert" className="admin-data-error">{error}</p>}
    <div className="admin-data-frame" aria-busy={loading}>
      {loading ? <p className="admin-data-state" role="status">Loading settings changes…</p> : data ? <>
        <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Settings changes table">
          <table><caption className="sr-only">Saved workspace preference changes</caption>
            <thead><tr>{['User', 'Setting', 'Before', 'After', 'Time · Kyiv'].map(title => <th key={title} scope="col">{title}</th>)}</tr></thead>
            <tbody>{data.rows.length ? data.rows.map(row => <tr key={row.id}>
              <td><Link className="admin-person-link" href={userProfileHref(row.user)}>{row.user.displayName || row.user.username}<small>@{row.user.username}</small></Link></td>
              <td>{labels[row.field] ?? row.field}</td>
              <td>{row.previousValue ? 'Enabled' : 'Disabled'}</td>
              <td>{row.nextValue ? 'Enabled' : 'Disabled'}</td>
              <td><time dateTime={row.createdAt}>{date.format(new Date(row.createdAt))}</time></td>
            </tr>) : <tr><td colSpan={5} className="admin-data-state">No settings changes recorded yet.</td></tr>}</tbody>
          </table>
        </div>
        <nav className="admin-data-pagination" aria-label="Settings changes pages">
          <span>{data.total ? (data.page - 1) * data.pageSize + 1 : 0}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}</span>
          <div><button type="button" disabled={data.page <= 1} onClick={() => navigate(data.page - 1)}>Previous</button>
            <button type="button" disabled={data.page * data.pageSize >= data.total} onClick={() => navigate(data.page + 1)}>Next</button></div>
        </nav>
      </> : <p className="admin-data-state">Use Refresh to try again.</p>}
    </div>
  </section>
}
