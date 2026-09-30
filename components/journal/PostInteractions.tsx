'use client'

import Link from 'next/link'
import { useState } from 'react'
import AuthModal from '@/components/AuthModal'
import { useAuthStore } from '@/store/useAuthStore'
import { journalApi, useJournalQuery, useJournalMutation, useJournalText } from '@/lib/journal/client'
import { Comment, PageResult, profileHref } from '@/lib/journal/types'
import { Feedback, DeleteButton, QueryError, JournalLoading } from './Primitives'
export default function PostInteractions({
  postId,
  count,
  comments
}: {
  postId: string;
  count: number;
  comments: number;
}) {
  const user = useAuthStore(s => s.user),
    t = useJournalText(),
    state = useJournalMutation()
  const [open, setOpen] = useState(false),
    [auth, setAuth] = useState(false),
    [content, setContent] = useState(''),
    [page, setPage] = useState(1),
    [commentCount, setCommentCount] = useState(comments)
  const support = useJournalQuery<{
    supported: boolean;
    count: number;
  }>(user && !user.isAnonymous ? `posts/${postId}/support` : null)
  const list = useJournalQuery<PageResult<Comment>>(open ? `posts/${postId}/comments?page=${page}` : null)
  return <div className="journal-interactions">
    <div className="journal-actions">
      <button type="button" disabled={state.busy || support.loading} aria-pressed={support.data?.supported ?? false} onClick={() => {
        if (!user || user.isAnonymous) {
          setAuth(true)
          return
        }
        void state.run(async () => support.setData(await journalApi(`posts/${postId}/support`, {
          method: support.data?.supported ? 'DELETE' : 'PUT'
        })))
      }}>
        {t('Support', 'Apoyar')}
        {' '}
        ·
        {' '}
        {support.data?.count ?? count}
      </button>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {t('Comments', 'Comentarios')}
        {' '}
        ·
        {' '}
        {commentCount}
      </button>
    </div>
    {support.error && <QueryError error={support.error} retry={support.reload} />}
    <Feedback state={state} />
    {open && <section aria-label={t('Comments', 'Comentarios')}>
      {list.loading ? <JournalLoading /> : list.error ? <QueryError error={list.error} retry={list.reload} /> : <>
        {list.data?.items.length === 0 && <p>{t('Start a thoughtful conversation.', 'Inicia una conversación constructiva.')}</p>}
        {list.data?.items.map(comment => <div className="journal-comment" key={comment.id}>
          <Link href={profileHref(comment.author.username)}>{comment.author.displayName || comment.author.username}</Link>
          <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString()}</time>
          <p>{comment.content}</p>
          {comment.author.id === user?.id && <DeleteButton busy={state.busy} label={t('Delete comment', 'Eliminar comentario')} onDelete={() => void state.run(async () => {
            await journalApi(`posts/${postId}/comments/${comment.id}`, {
              method: 'DELETE'
            })
            if (list.data?.items.length === 1 && page > 1) setPage(page - 1);else list.reload()
          })} />}
        </div>)}
        <div className="journal-actions">
          {page > 1 && <button onClick={() => setPage(page - 1)}>{t('Previous', 'Anterior')}</button>}
          {list.data?.hasMore && <button onClick={() => setPage(page + 1)}>{t('Next', 'Siguiente')}</button>}
        </div>
      </>}
      <form noValidate onSubmit={e => {
        e.preventDefault()
        if (!user || user.isAnonymous) {
          setAuth(true)
          return
        }
        void state.run(async () => {
          await journalApi(`posts/${postId}/comments`, {
            method: 'POST',
            body: JSON.stringify({
              content
            })
          })
          setCommentCount(value => value + 1)
          setContent('')
          list.reload()
        }, t('Comment added', 'Comentario añadido'))
      }}>
        <label>
          {t('Your comment', 'Tu comentario')}
          <textarea className="resize-none" value={content} onChange={e => setContent(e.target.value)} maxLength={2000} rows={3} />
        </label>
        <button className="journal-button" disabled={state.busy || !content.trim()}>{state.busy ? t('Posting…', 'Publicando…') : t('Post comment', 'Publicar comentario')}</button>
      </form>
    </section>}
    <AuthModal isOpen={auth} onClose={() => setAuth(false)} />
  </div>
}
