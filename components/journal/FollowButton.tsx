'use client'

import { useState } from 'react'
import AuthModal from '@/components/AuthModal'
import { useAuthStore } from '@/store/useAuthStore'
import { journalApi, useJournalQuery, useJournalMutation, useJournalText } from '@/lib/journal/client'
import { Feedback } from './Primitives'
export default function FollowButton({
  userId,
  count
}: {
  userId: string;
  count: number;
}) {
  const user = useAuthStore(s => s.user),
    [auth, setAuth] = useState(false),
    t = useJournalText(),
    state = useJournalMutation()
  const query = useJournalQuery<{
    following: boolean;
    count: number;
  }>(user && !user.isAnonymous && user.id !== userId ? `follow/${userId}` : null)
  if (user?.id === userId) return <small>
    {count}
    {' '}
    {t('followers', 'seguidores')}
  </small>
  return <div>
    <button type="button" className="journal-button secondary" disabled={state.busy || query.loading} aria-pressed={query.data?.following ?? false} onClick={() => {
      if (!user || user.isAnonymous) {
        setAuth(true)
        return
      }
      void state.run(async () => {
        const result = await journalApi<{
          following: boolean;
          count: number;
        }>(`follow/${userId}`, {
          method: query.data?.following ? 'DELETE' : 'PUT'
        })
        query.setData(result)
      })
    }}>
      {query.data?.following ? t('Following', 'Siguiendo') : t('Follow', 'Seguir')}
    </button>
    <small>
      {' '}
      {query.data?.count ?? count}
      {' '}
      {t('followers', 'seguidores')}
    </small>
    {query.error && <p role="alert">
      {query.error}
      {' '}
      <button onClick={query.reload}>{t('Retry', 'Reintentar')}</button>
    </p>}
    <Feedback state={state} />
    <AuthModal isOpen={auth} onClose={() => setAuth(false)} />
  </div>
}
