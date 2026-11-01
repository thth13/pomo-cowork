'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { userProfileHref } from '@/lib/userProfile'
import { useAdminData } from './useAdminData'

type BeepRow = {
  id: string; sequence: number; userText: string; assistantText: string; status: string; createdAt: string
  conversation: {
    id: string; title: string; greeting: string | null; createdAt: string; updatedAt: string; revision: number
    activeRequestId: string | null; activeUntil: string | null; _count: { turns: number }
    user: { id: string; username: string; email: string; isAnonymous: boolean }
  }
}
type BeepData = { rows: BeepRow[]; total: number; page: number; pageSize: number }
const statuses = { all: 'All', completed: 'Completed', pending: 'Pending', interrupted: 'Interrupted', failed: 'Failed' }
const date = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value))

export default function AdminBeepMessages() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const rawPage = Number(params.get('beepPage') ?? 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const rawStatus = params.get('beepStatus') ?? 'all'
  const status = Object.hasOwn(statuses, rawStatus) ? rawStatus as keyof typeof statuses : 'all'
  const conversationId = params.get('beepConversation') || null
  const { data, loading, error, refresh } = useAdminData<BeepData>('/api/admin/beep-messages', JSON.stringify({ page, status, conversationId }))

  function navigate(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    router.replace(`${pathname}?${next}#beep`, { scroll: false })
  }

  return <section aria-label="Beep messages">
    <div className="admin-data-toolbar">
      <div><h2>Beep messages{data ? ` · ${data.total.toLocaleString('en-US')} turns` : ''}</h2>
        <p>{conversationId ? 'Selected conversation, in chronological order.' : 'All saved questions and replies, newest turns first.'}</p>
      </div>
      <button type="button" onClick={refresh} disabled={loading}>Refresh</button>
    </div>
    <p className="admin-data-note admin-beep-note">Each turn contains a user message and Beep’s reply. Unsaved guest chats are unavailable. Model, token usage and response duration are not recorded.</p>
    <div className="admin-data-filters admin-beep-filters" role="group" aria-label="Reply status">
      {Object.entries(statuses).map(([value, label]) => <button type="button" key={value} aria-pressed={status === value} onClick={() => navigate({ beepStatus: value === 'all' ? null : value, beepPage: null })}>{label}</button>)}
    </div>
    {conversationId && <div className="admin-data-toolbar"><p className="admin-beep-id">Conversation: {conversationId}</p><button type="button" onClick={() => navigate({ beepConversation: null, beepPage: null })}>Show all conversations</button></div>}
    {error && <p className="admin-data-error" role="alert">{error}</p>}
    <div className="admin-data-frame" aria-busy={loading}>
      {loading ? <p className="admin-data-state" role="status">Loading Beep messages…</p> : data ? <>
        <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Beep messages table">
          <table><caption className="sr-only">Saved Beep messages with account, conversation and reply details</caption>
            <thead><tr>{['User', 'Conversation', 'User message', 'Beep reply', 'Status', 'Sent · Kyiv'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>{data.rows.length === 0 ? <tr><td colSpan={6} className="admin-data-state">{status !== 'all' || conversationId ? 'No saved messages match these filters.' : 'No saved Beep messages yet.'}</td></tr> : data.rows.map(row => {
              const chat = row.conversation
              const expired = row.status === 'pending' && (chat.activeRequestId !== row.id || !chat.activeUntil || new Date(chat.activeUntil).getTime() <= Date.now())
              return <tr key={row.id}>
                <td><Link className="admin-person-link" href={userProfileHref(chat.user)}>{chat.user.username}<small>{chat.user.isAnonymous ? 'Guest account' : chat.user.email}</small><small>ID: {chat.user.id}</small></Link></td>
                <td className="admin-beep-conversation">
                  <button className="admin-beep-link" type="button" onClick={() => navigate({ beepConversation: chat.id, beepPage: null, beepStatus: null })}>{chat.title}</button>
                  <p className="admin-data-note">Turn {row.sequence} of {chat._count.turns}</p>
                  <details className="admin-beep-details"><summary>Conversation info</summary>
                    <dl><dt>Conversation ID</dt><dd>{chat.id}</dd><dt>Turn ID</dt><dd>{row.id}</dd><dt>Created · Kyiv</dt><dd>{date(chat.createdAt)}</dd><dt>Last updated · Kyiv</dt><dd>{date(chat.updatedAt)}</dd><dt>Revision</dt><dd>{chat.revision}</dd></dl>
                    {chat.greeting && <><h3>Opening greeting</h3><p className="admin-beep-text">{chat.greeting}</p></>}
                  </details>
                </td>
                <td className="admin-message-cell">{row.userText}</td>
                <td className="admin-message-cell">{row.assistantText || <span className="admin-data-note">No saved reply.</span>}</td>
                <td><span className={`admin-status ${row.status === 'completed' ? 'admin-status-active' : 'admin-status-archived'}`}>{expired ? 'Pending · expired' : statuses[row.status as keyof typeof statuses] ?? row.status}</span>{expired && <p className="admin-data-note">Generation lease expired or released.</p>}</td>
                <td>{date(row.createdAt)}</td>
              </tr>
            })}</tbody>
          </table>
        </div>
        <nav className="admin-data-pagination" aria-label="Beep message pages"><span>{data.total ? (data.page - 1) * data.pageSize + 1 : 0}–{Math.min(data.page * data.pageSize, data.total)} of {data.total} turns · Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><div><button type="button" disabled={data.page <= 1} onClick={() => navigate({ beepPage: String(data.page - 1) })}>Previous</button><button type="button" disabled={data.page * data.pageSize >= data.total} onClick={() => navigate({ beepPage: String(data.page + 1) })}>Next</button></div></nav>
      </> : <p className="admin-data-state">Use Refresh to try loading messages again.</p>}
    </div>
  </section>
}
