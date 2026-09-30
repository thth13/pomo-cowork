'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectSelection } from '@/store/useProjectSelection'
import { useAuthStore } from '@/store/useAuthStore'
import { useTimerStore } from '@/store/useTimerStore'
import { useJournalQuery, useJournalText } from '@/lib/journal/client'
import { PageResult, Project } from '@/lib/journal/types'
export default function ProjectPicker() {
  const user = useAuthStore(s => s.user),
    session = useTimerStore(s => s.currentSession),
    selection = useProjectSelection(),
    [page, setPage] = useState(1),
    t = useJournalText()
  const query = useJournalQuery<PageResult<Pick<Project, 'id' | 'name' | 'visibility'>>>(user && !user.isAnonymous ? `projects?picker=1&page=${page}` : null)
  const selected = user && selection.userId === user.id ? selection.projectId || '' : ''
  const value = session && !session.id.startsWith('temp_') ? session.projectId || '' : selected
  const detail = useJournalQuery<Project>(user && !user.isAnonymous && value ? `projects/${value}` : null)
  useEffect(() => {
    if (!session && user && value && detail.error === 'Project not found.') useProjectSelection.getState().select(user.id, null)
  }, [session, user, value, detail.error])
  if (!user || user.isAnonymous) return null
  return <div className="journal-picker">
    <label>
      {t('Focus project', 'Proyecto de enfoque')}
      {' '}
      <select aria-label={t('Focus project', 'Proyecto de enfoque')} value={value} disabled={Boolean(session) || query.loading} onChange={event => {
        const project = query.data?.items.find(p => p.id === event.target.value)
        selection.select(user.id, project?.id || null, project?.name)
      }}>
        <option value="">{t('No project', 'Sin proyecto')}</option>
        {value && !query.data?.items.some(p => p.id === value) && <option value={value}>{detail.data?.name || selection.name || t('Current project', 'Proyecto actual')}</option>}
        {query.data?.items.map(p => <option key={p.id} value={p.id}>
          {p.name}
          {p.visibility === 'PRIVATE' ? ' · ' + t('private', 'privado') : ''}
        </option>)}
      </select>
    </label>
    {query.error && <span role="alert">
      {' '}
      {query.error}
      {' '}
      <button type="button" onClick={query.reload}>{t('Retry', 'Reintentar')}</button>
    </span>}
    {!session && <div>
      {page > 1 && <button type="button" onClick={() => setPage(page - 1)}>{t('Previous', 'Anterior')}</button>}
      {query.data?.hasMore && <button type="button" onClick={() => setPage(page + 1)}>{t('More projects', 'Más proyectos')}</button>}
      {' '}
      <Link href="/projects/new">{t('New project', 'Nuevo proyecto')}</Link>
    </div>}
  </div>
}
export function FocusProjectButton({
  userId,
  projectId,
  name
}: {
  userId: string;
  projectId: string;
  name: string;
}) {
  const user = useAuthStore(s => s.user),
    session = useTimerStore(s => s.currentSession),
    select = useProjectSelection(s => s.select),
    router = useRouter(),
    t = useJournalText()
  if (user?.id !== userId) return null
  return <>
    <button type="button" className="journal-button" disabled={Boolean(session)} onClick={() => {
      select(userId, projectId, name)
      router.push('/')
    }}>
      {t('Focus on this project', 'Enfocarme en este proyecto')}
    </button>
    {session && <small>{t('Finish or reset your current session to change projects.', 'Termina o reinicia la sesión actual para cambiar de proyecto.')}</small>}
  </>
}
