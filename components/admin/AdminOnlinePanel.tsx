'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useConnectionStore } from '@/store/useConnectionStore'
import { userProfileHref } from '@/lib/userProfile'
import { useAdminData } from './useAdminData'

type OnlineUser = { id: string; username: string; isAnonymous: boolean }
type OnlinePage = { rows: OnlineUser[]; total: number; page: number; pageSize: number }

export default function AdminOnlinePanel() {
  const [page, setPage] = useState(1)
  const connected = useConnectionStore(state => state.isConnected)
  const onlineIds = useConnectionStore(state => state.onlineUserIds)
  const anonymousCount = useConnectionStore(state => state.anonymousOnlineCount)
  const { data, error, loading, refresh } = useAdminData<OnlinePage>('/api/admin/data', JSON.stringify({
    kind: 'online', page, compact: true, onlineIds: Object.keys(onlineIds).sort(),
  }), connected)

  return <section className="admin-online-panel" aria-label="Online users">
    <div className="admin-online-panel-heading">
      <h2>Online users{data && <span>{data.total}</span>}</h2>
      <span className="admin-data-note">Live presence</span>
    </div>
    <div className="admin-online-panel-body" aria-busy={loading}>
      {!connected ? <p role="status">Reconnecting to live presence…</p>
        : error ? <div role="alert"><p>{error}</p><button type="button" onClick={refresh}>Retry</button></div>
        : loading ? <p role="status">Loading online users…</p>
        : data?.rows.length ? <ul>{data.rows.map(user => <li key={user.id}>
          <Link href={userProfileHref(user)} title={user.username}>
            <span className="admin-online-initial" aria-hidden="true">{user.username.slice(0, 1).toUpperCase()}<i /></span>
            <span className="admin-online-name">{user.username}<small>{user.isAnonymous ? 'Guest · Online' : 'Online'}</small></span>
          </Link>
        </li>)}</ul> : <p>No accounts are online right now.</p>}
    </div>
    {data && data.total > data.pageSize && <nav className="admin-data-pagination" aria-label="Online users pages">
      <span>Page {data.page} of {Math.ceil(data.total / data.pageSize)}</span><div>
        <button type="button" disabled={loading || data.page <= 1} onClick={() => setPage(data.page - 1)}>Previous</button>
        <button type="button" disabled={loading || data.page * data.pageSize >= data.total} onClick={() => setPage(data.page + 1)}>Next</button>
      </div>
    </nav>}
    {connected && <p className="admin-online-panel-note">
      {data && data.total > data.rows.length ? `Showing ${(data.page - 1) * data.pageSize + 1}–${Math.min(data.page * data.pageSize, data.total)} of ${data.total} accounts. ` : ''}
      Live presence{anonymousCount > 0 ? ` · ${anonymousCount} anonymous visitors online` : ''}
    </p>}
  </section>
}
