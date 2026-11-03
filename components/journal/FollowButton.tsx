'use client'

import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import AuthModal from '@/components/AuthModal'
import { useAuthStore } from '@/store/useAuthStore'
import { journalApi, useJournalQuery, useJournalMutation, useJournalText } from '@/lib/journal/client'
import { Feedback } from './Primitives'
export default function FollowButton({
  userId,
  count,
  projectId,
  variant = 'default',
  onCountChange
}: {
  userId: string;
  count: number;
  projectId?: string;
  variant?: 'default' | 'bookmark';
  onCountChange?: (count: number) => void;
}) {
  const user = useAuthStore(s => s.user),
    [auth, setAuth] = useState(false),
    t = useJournalText(),
    state = useJournalMutation()
  const endpoint = projectId ? `projects/${projectId}/follow` : `follow/${userId}`
  const query = useJournalQuery<{
    following: boolean;
    count: number;
  }>(user && !user.isAnonymous && user.id !== userId ? endpoint : null)
  if (user?.id === userId && variant === 'bookmark') return null
  if (user?.id === userId) return <small>
    {count}
    {' '}
    {t('followers', 'seguidores')}
  </small>
  const label = query.data?.following ? t('Unfollow project', 'Dejar de seguir el proyecto') : t('Follow project', 'Seguir proyecto')
  return <div className={variant === 'bookmark' ? 'project-catalog-follow' : undefined}>
    <button type="button" className={variant === 'bookmark' ? 'project-catalog-bookmark' : 'journal-button secondary'} title={variant === 'bookmark' ? label : undefined} aria-label={variant === 'bookmark' ? label : undefined} aria-busy={state.busy} disabled={state.busy || query.loading || Boolean(query.error)} aria-pressed={query.data?.following ?? false} onClick={() => {
      if (!user || user.isAnonymous) {
        setAuth(true)
        return
      }
      void state.run(async () => {
        const result = await journalApi<{
          following: boolean;
          count: number;
        }>(endpoint, {
          method: query.data?.following ? 'DELETE' : 'PUT'
        })
        query.setData(result)
        onCountChange?.(result.count)
      })
    }}>
      {variant === 'bookmark' ? <Bookmark size={21} fill={query.data?.following ? 'currentColor' : 'none'} aria-hidden="true" /> : query.data?.following ? t('Following', 'Siguiendo') : projectId ? t('Follow project', 'Seguir proyecto') : t('Follow', 'Seguir')}
    </button>
    {variant === 'default' && <small>
      {' '}
      {query.data?.count ?? count}
      {' '}
      {t('followers', 'seguidores')}
    </small>}
    {query.error && <p role="alert">
      {query.error}
      {' '}
      <button onClick={query.reload}>{t('Retry', 'Reintentar')}</button>
    </p>}
    <Feedback state={state} />
    <AuthModal isOpen={auth} onClose={() => setAuth(false)} />
  </div>
}
