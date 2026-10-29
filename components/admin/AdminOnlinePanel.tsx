'use client'

import Link from 'next/link'
import { useConnectionStore } from '@/store/useConnectionStore'
import { userProfileHref } from '@/lib/userProfile'
import { useAdminData } from './useAdminData'

type OnlineUser = { id: string; username: string; isAnonymous: boolean }
type OnlinePage = { rows: OnlineUser[]; total: number }

export default function AdminOnlinePanel() {
  const connected = useConnectionStore(state => state.isConnected)
  const onlineIds = useConnectionStore(state => state.onlineUserIds)
  const anonymousCount = useConnectionStore(state => state.anonymousOnlineCount)
  const { data, error, loading, refresh } = useAdminData<OnlinePage>('/api/admin/data', JSON.stringify({
    kind: 'online', page: 1, compact: true, onlineIds: Object.keys(onlineIds).sort(),
  }), connected)

  return <section className="admin-online-panel" aria-label="Online users">
    <div className="admin-online-panel-heading">
      <h2>Online users{data && <span>{data.total}</span>}</h2>
      <a href="#online">View all users →</a>
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
    {connected && <p className="admin-online-panel-note">
      {data && data.total > data.rows.length ? `Showing ${data.rows.length} of ${data.total} accounts. ` : ''}
      Live presence{anonymousCount > 0 ? ` · ${anonymousCount} anonymous visitors outside the account list` : ''}
    </p>}
  </section>
}
