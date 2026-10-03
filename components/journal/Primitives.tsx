'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import AuthModal from '@/components/AuthModal'
import { useJournalText, useJournalMutation } from '@/lib/journal/client'
export function AuthGate({
  children,
  loadingFallback
}: {
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
}) {
  const {
      user,
      isLoading
    } = useAuthStore(),
    [open, setOpen] = useState(false),
    t = useJournalText()
  if (isLoading) return loadingFallback ?? <JournalLoading />
  if (!user || user.isAnonymous) return <section className="journal-empty">
    <h1>{t('Your project journal', 'Tu diario de proyectos')}</h1>
    <p>{t('Sign in to build, track your work, and share your progress.', 'Inicia sesión para crear proyectos, registrar tu trabajo y compartir tus avances.')}</p>
    <button className="journal-button" onClick={() => setOpen(true)}>{t('Sign in', 'Iniciar sesión')}</button>
    <AuthModal isOpen={open} onClose={() => setOpen(false)} />
  </section>
  return <>{children}</>
}
export function JournalLoading() {
  const t = useJournalText()
  return <div className="journal-skeleton" role="status" aria-label={t('Loading journal', 'Cargando diario')}>
  <div />
  <div />
  <div />
  </div>
}
export function Feedback({
  state
}: {
  state: ReturnType<typeof useJournalMutation>;
}) {
  return <><div ref={state.errorRef} tabIndex={-1} className="journal-error" role={state.error ? 'alert' : undefined}>{state.error}</div></>
}
export function QueryError({
  error,
  retry
}: {
  error: string;
  retry: () => void;
}) {
  const t = useJournalText()
  return <div role="alert" className="journal-empty">
  <p>{error}</p>
  <button onClick={retry}>{t('Try again', 'Reintentar')}</button>
  </div>
}
export function OwnerActions({
  userId,
  projectId,
  postId
}: {
  userId: string;
  projectId?: string;
  postId?: string;
}) {
  const user = useAuthStore(s => s.user),
    t = useJournalText()
  if (user?.id !== userId) return null
  return <div className="journal-actions">
    <Link className="journal-button secondary" href={postId ? `/journal/compose?edit=${postId}` : projectId ? `/projects/${projectId}/edit` : '/settings/profile'}>{t('Edit', 'Editar')}</Link>
    <Link className="journal-button" href={`/journal/compose${projectId ? `?project=${projectId}` : ''}`}>{t('Post update', 'Publicar actualización')}</Link>
    {!projectId && !postId && <Link href="/projects">{t('My projects', 'Mis proyectos')}</Link>}
  </div>
}
export function JournalImage({
  src,
  alt
}: {
  src: string;
  alt: string;
}) {
  const token = useAuthStore(s => s.token),
    [source, setSource] = useState<string | null>(null)
  useEffect(() => {
    if (!src.startsWith('/api/journal/images/') || !token) {
      setSource(src)
      return
    }
    const controller = new AbortController()
    let objectUrl: string | undefined
    setSource(null)
    fetch(src, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      signal: controller.signal
    }).then(async response => {
      if (!response.ok) throw new Error()
      const blob = await response.blob()
      if (controller.signal.aborted) return
      objectUrl = URL.createObjectURL(blob)
      setSource(objectUrl)
    }).catch(() => {
      if (!controller.signal.aborted) setSource(null)
    })
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src, token])
  return source ? <Image unoptimized width={1200} height={675} src={source} alt={alt} loading="lazy" className="journal-image" /> : <div className="journal-image-placeholder" role="img" aria-label={alt} />
}
export function DeleteButton({
  onDelete,
  busy,
  label
}: {
  onDelete: () => void;
  busy: boolean;
  label: string;
}) {
  const [confirm, setConfirm] = useState(false),
    t = useJournalText()
  return confirm ? <div className="journal-confirm" role="group" aria-label={label}>
    <p>{t('Delete permanently? This cannot be undone.', '¿Eliminar definitivamente? No se puede deshacer.')}</p>
    <button type="button" disabled={busy} onClick={() => setConfirm(false)}>{t('Keep it', 'Conservar')}</button>
    <button className="journal-danger" type="button" disabled={busy} onClick={onDelete}>{label}</button>
  </div> : <button type="button" className="journal-danger" onClick={() => setConfirm(true)}>{label}</button>
}
