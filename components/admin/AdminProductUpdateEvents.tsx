'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getProductUpdate } from '@/lib/productUpdates'
import { userProfileHref } from '@/lib/userProfile'
import { useAdminData } from './useAdminData'

type Events = {
  rows: { id: string; productUpdateId: string; action: 'scrolled_to_end' | 'closed'; createdAt: string
    user: { id: string; username: string; displayName: string | null; avatarUrl: string | null; isAnonymous: boolean } }[]
  total: number; page: number; pageSize: number
}
const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', dateStyle: 'medium', timeStyle: 'medium' })

export default function AdminProductUpdateEvents() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const rawPage = Number(params.get('updateEventsPage') ?? 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const { data, loading, error, refresh } = useAdminData<Events>(`/api/admin/product-update-events?page=${page}`)
  function navigate(nextPage: number) {
    const next = new URLSearchParams(params.toString())
    next.set('updateEventsPage', String(nextPage))
    router.replace(`${pathname}?${next}#updates`, { scroll: false })
  }
  return <section aria-label="Product update activity">
    <div className="admin-data-toolbar">
      <div><h2>Update activity{data ? ` · ${data.total.toLocaleString('en-US')} events` : ''}</h2>
        <p>Newest first. Times are shown in Kyiv time. Admin previews are excluded.</p></div>
      <button type="button" onClick={refresh} disabled={loading}>Refresh</button>
    </div>
    {error && <p role="alert" className="admin-data-error">{error}</p>}
    <div className="admin-data-frame" aria-busy={loading}>
      {loading ? <p className="admin-data-state" role="status">Loading update activity…</p> : data ? <>
        <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Product update activity table">
          <table><caption className="sr-only">Product update scroll and close events</caption>
            <thead><tr>{['User', 'Update', 'Event', 'Time · Kyiv'].map(title => <th key={title} scope="col">{title}</th>)}</tr></thead>
            <tbody>{data.rows.length ? data.rows.map(row => <tr key={row.id}>
              <td><Link className="admin-person-link admin-update-person" href={userProfileHref(row.user)}>
                {row.user.avatarUrl ? <img className="admin-avatar" src={row.user.avatarUrl} alt="" width={36} height={36} loading="lazy" />
                  : <span className="admin-avatar" aria-hidden="true">{(row.user.displayName || row.user.username).slice(0, 1).toUpperCase()}</span>}
                <span>{row.user.displayName || row.user.username}<small>@{row.user.username}</small></span>
              </Link></td>
              <td>{getProductUpdate(row.productUpdateId)?.title.en ?? row.productUpdateId}</td>
              <td>{row.action === 'scrolled_to_end' ? 'Scrolled to end' : 'Closed modal'}</td>
              <td><time dateTime={row.createdAt}>{date.format(new Date(row.createdAt))}</time></td>
            </tr>) : <tr><td colSpan={4} className="admin-data-state">No update activity recorded yet.</td></tr>}</tbody>
          </table>
        </div>
        <nav className="admin-data-pagination" aria-label="Product update activity pages">
          <span>{data.total ? (data.page - 1) * data.pageSize + 1 : 0}–{Math.min(data.page * data.pageSize, data.total)} of {data.total} events</span>
          <div><button type="button" disabled={data.page <= 1} onClick={() => navigate(data.page - 1)}>Previous</button>
            <button type="button" disabled={data.page * data.pageSize >= data.total} onClick={() => navigate(data.page + 1)}>Next</button></div>
        </nav>
      </> : <p className="admin-data-state">Use Refresh to try loading activity again.</p>}
    </div>
  </section>
}
