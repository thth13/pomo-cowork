'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useConnectionStore } from '@/store/useConnectionStore'
import { userProfileHref } from '@/lib/userProfile'
import { useAdminData } from './useAdminData'

export type AdminDataKind = 'directory' | 'online' | 'wall' | 'habits'
type Person = { id: string; username: string; isAnonymous: boolean }
type UserRow = Person & { countryCode: string | null; createdAt: string; lastSeenAt: string | null; totalMinutes: number; totalPomodoros: number; sessionsCount: number }
type WallRow = { id: string; message: string; createdAt: string; author: Person; profileUser: Person }
type HabitRow = { id: string; title: string; startDate: string; archived: boolean; createdAt: string; user: Person; _count: { completions: number } }
type ListData = { rows: (UserRow | WallRow | HabitRow)[]; total: number; page: number; pageSize: number }
const titles = { directory: 'All users', online: 'Online users', wall: 'Wall messages', habits: 'Habits' }
const date = (value: string | null) => value ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Never'
const person = (user: Person) => <Link className="admin-person-link" href={userProfileHref(user)}>{user.username}<small>{user.isAnonymous ? 'Guest' : 'Registered'} · {user.id}</small></Link>

export default function AdminDataTable({ kind }: { kind: AdminDataKind }) {
  const [page, setPage] = useState(1)
  const [userType, setUserType] = useState('registered')
  const onlineIds = useConnectionStore(state => state.onlineUserIds)
  const connected = useConnectionStore(state => state.isConnected)
  const anonymousCount = useConnectionStore(state => state.anonymousOnlineCount)
  const body = JSON.stringify({ kind, page, userType, ...(kind === 'online' ? { onlineIds: Object.keys(onlineIds).sort() } : {}) })
  const { data, error, loading, refresh } = useAdminData<ListData>('/api/admin/data', body, kind !== 'online' || connected)
  const headers = kind === 'wall' ? ['Author', 'Profile wall', 'Message', 'Created · Kyiv'] : kind === 'habits' ? ['Habit', 'Owner', 'Status', 'Start date', 'Completions', 'Created · Kyiv'] : ['User', 'Country', 'Created · Kyiv', 'Last seen · Kyiv', 'Focus time', 'Pomodoros', 'Sessions']

  return <section aria-label={titles[kind]}>
    <div className="admin-data-toolbar">
      <div><h2>{titles[kind]}{data ? ` · ${data.total.toLocaleString('en-US')}` : ''}</h2>
        {kind === 'online' && <p role="status">{connected ? `Live presence · ${anonymousCount} anonymous connections outside the account list` : 'Live connection unavailable. Reconnecting…'}</p>}
        {kind === 'habits' && <p>All active and archived habits, newest first.</p>}
        {kind === 'wall' && <p>All existing profile wall messages, newest first.</p>}
      </div>
      <button type="button" onClick={refresh} disabled={loading || (kind === 'online' && !connected)}>Refresh</button>
    </div>
    {kind === 'directory' && <div className="admin-data-filters" role="group" aria-label="Account type">{['registered', 'anonymous'].map(value => <button type="button" key={value} aria-pressed={userType === value} onClick={() => { setUserType(value); setPage(1) }}>{value === 'registered' ? 'Registered' : 'Unregistered'}</button>)}</div>}
    {error && <p role="alert" className="admin-data-error">{error}</p>}
    <div className="admin-data-frame" aria-busy={loading}>
      {loading ? <p className="admin-data-state" role="status">Loading {titles[kind].toLowerCase()}…</p> : data ? <>
        <div className="admin-table-scroll" tabIndex={0} role="region" aria-label={`${titles[kind]} table`}>
          <table><caption className="sr-only">{titles[kind]}</caption><thead><tr>{headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead>
            <tbody>{data.rows.length === 0 ? <tr><td colSpan={headers.length} className="admin-data-state">No {titles[kind].toLowerCase()} found.</td></tr> : data.rows.map(row => {
              if ('message' in row) return <tr key={row.id}><td>{person(row.author)}</td><td>{person(row.profileUser)}</td><td className="admin-message-cell">{row.message}</td><td>{date(row.createdAt)}</td></tr>
              if ('title' in row) return <tr key={row.id}><td className="admin-message-cell">{row.title}</td><td>{person(row.user)}</td><td><span className="admin-status">{row.archived ? 'Archived' : 'Active'}</span></td><td>{row.startDate}</td><td>{row._count.completions}</td><td>{date(row.createdAt)}</td></tr>
              return <tr key={row.id}><td>{person(row)}{connected && onlineIds[row.id] && <span className="admin-online-status">Online</span>}</td><td>{row.countryCode || '—'}</td><td>{date(row.createdAt)}</td><td>{date(row.lastSeenAt)}</td><td>{Math.floor(row.totalMinutes / 60)}h {row.totalMinutes % 60}m</td><td>{row.totalPomodoros}</td><td>{row.sessionsCount}</td></tr>
            })}</tbody>
          </table>
        </div>
        <nav className="admin-data-pagination" aria-label={`${titles[kind]} pages`}><span>{data.total ? (data.page - 1) * data.pageSize + 1 : 0}–{Math.min(data.page * data.pageSize, data.total)} of {data.total} · Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><div><button type="button" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>Previous</button><button type="button" disabled={data.page * data.pageSize >= data.total} onClick={() => setPage(data.page + 1)}>Next</button></div></nav>
      </> : <p className="admin-data-state">{kind === 'online' && !connected ? 'Online users will appear when the live connection is restored.' : 'Use Refresh to try loading this list again.'}</p>}
    </div>
  </section>
}
