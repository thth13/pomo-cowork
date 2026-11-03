'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { userProfileHref } from '@/lib/userProfile'
import { useAdminData } from './useAdminData'

type RecentUsers = {
  rows: { id: string; username: string; isAnonymous: boolean; lastSeenAt: string | null }[]
  total: number; page: number; pageSize: number
}
const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', dateStyle: 'medium', timeStyle: 'short' })

export default function AdminRecentUsers() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const days = params.get('activityDays') === '30' ? 30 : 7
  const rawPage = Number(params.get('activityPage') ?? 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const { data, loading, error, refresh } = useAdminData<RecentUsers>(`/api/admin/recent-users?days=${days}&page=${page}`)

  function navigate(nextDays: number, nextPage: number) {
    const next = new URLSearchParams(params.toString())
    next.set('activityDays', String(nextDays))
    next.set('activityPage', String(nextPage))
    router.replace(`${pathname}?${next}${window.location.hash}`, { scroll: false })
  }

  return <section className="admin-recent-users" aria-label="Latest user activity">
    <div className="admin-data-toolbar">
      <div><h2>Latest user activity{data ? ` · ${data.total.toLocaleString('en-US')} active users` : ''}</h2>
        <p>Registered users seen in the last {days} days, most recent first. Times are shown in Kyiv time.</p></div>
      <button type="button" onClick={refresh} disabled={loading}>Refresh</button>
    </div>
    <div className="admin-data-filters" role="group" aria-label="Activity period">
      {[7, 30].map(value => <button type="button" key={value} aria-pressed={days === value} onClick={() => navigate(value, 1)}>Last {value} days</button>)}
    </div>
    <p className="admin-data-note">Based on recorded connections and disconnections, not completed focus sessions. Guest accounts and users with no recorded visit are excluded.</p>
    {error && <p className="admin-data-error" role="alert">{error}</p>}
    <div className="admin-data-frame" aria-busy={loading}>
      {loading ? <p className="admin-data-state" role="status">Loading recent users…</p> : data ? <>
        <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Recently active users table">
          <table>
            <caption className="sr-only">Registered users active in the last {days} days</caption>
            <thead><tr><th scope="col">User</th><th scope="col">Last seen · Kyiv</th></tr></thead>
            <tbody>{data.rows.length ? data.rows.map(user => <tr key={user.id}>
              <td><Link className="admin-person-link" href={userProfileHref(user)}>{user.username}</Link></td>
              <td>{user.lastSeenAt ? <time dateTime={user.lastSeenAt}>{date.format(new Date(user.lastSeenAt))}</time> : '—'}</td>
            </tr>) : <tr><td colSpan={2} className="admin-data-state">No registered users were seen in the last {days} days.</td></tr>}</tbody>
          </table>
        </div>
        <nav className="admin-data-pagination" aria-label="Recently active users pages">
          <span>{data.total ? (data.page - 1) * data.pageSize + 1 : 0}–{Math.min(data.page * data.pageSize, data.total)} of {data.total} users</span>
          <div><button type="button" disabled={data.page <= 1} onClick={() => navigate(days, data.page - 1)}>Previous</button>
            <button type="button" disabled={data.page * data.pageSize >= data.total} onClick={() => navigate(days, data.page + 1)}>Next</button></div>
        </nav>
      </> : <p className="admin-data-state">Use Refresh to try loading recent users again.</p>}
    </div>
  </section>
}
