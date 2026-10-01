'use client'

import Link from 'next/link'
import MonthlyRecaps from '@/components/wrapped/MonthlyRecaps'
import { useWrapped } from '@/components/wrapped/WrappedProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useJournalQuery, useJournalText } from '@/lib/journal/client'
import { PageResult, Post, Project, Author, profileHref } from '@/lib/journal/types'
import { AuthGate, JournalLoading, QueryError } from './Primitives'
import { FocusStats, UpdateCard } from './Cards'
import { FocusProjectButton } from './ProjectPicker'
import FollowButton from './FollowButton'
export function Feed() {
  return <AuthGate><Posts mode="feed" /></AuthGate>
}
export function MyUpdates() {
  return <AuthGate><Posts mode="posts" /></AuthGate>
}
function usePage() {
  const params = useSearchParams(),
    router = useRouter(),
    page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1)
  return {
    page,
    move: (next: number) => router.push(`?page=${next}`)
  }
}
function Pagination({
  page,
  more,
  move
}: {
  page: number;
  more: boolean;
  move: (page: number) => void;
}) {
  const t = useJournalText()
  return <nav className="journal-pagination" aria-label={t('Pagination', 'Paginación')}>
  {page > 1 && <button onClick={() => move(page - 1)}>{t('Previous', 'Anterior')}</button>}
  {more && <button onClick={() => move(page + 1)}>{t('Next', 'Siguiente')}</button>}
  </nav>
}
function Posts({
  mode
}: {
  mode: 'feed' | 'posts';
}) {
  const {
      page,
      move
    } = usePage(),
    query = useJournalQuery<PageResult<Post>>(`${mode}?page=${page}`),
    t = useJournalText()
  return <>
    <header className="journal-row">
      <h1>{mode === 'feed' ? t('From people you follow', 'De las personas que sigues') : t('Your updates', 'Tus actualizaciones')}</h1>
      <Link className="journal-button" href="/journal/compose">{t('Post update', 'Publicar actualización')}</Link>
    </header>
    <div className="journal-actions">
      <Link href="/discover">{t('Discover people', 'Descubrir personas')}</Link>
      <Link href="/journal/monthly">{t('Monthly Wrapped', 'Resumen del mes')}</Link>
    </div>
    {query.loading ? <JournalLoading /> : query.error ? <QueryError error={query.error} retry={query.reload} /> : <>
      {query.data?.items.length === 0 && <section className="journal-empty">
        <h2>{mode === 'feed' ? t('Follow people to see what they are building.', 'Sigue a personas para ver lo que están creando.') : t('Share what you have been working on.', 'Comparte en qué has estado trabajando.')}</h2>
        <Link href={mode === 'feed' ? '/discover' : '/journal/compose'}>{mode === 'feed' ? t('Discover people', 'Descubrir personas') : t('Post update', 'Publicar actualización')}</Link>
      </section>}
      {query.data?.items.map(post => <div key={post.id}>
        {mode === 'posts' && <div className="journal-row">
          <span className="journal-badge">{post.publishedAt ? post.visibility.toLowerCase() : t('Draft', 'Borrador')}</span>
          <Link href={`/journal/compose?edit=${post.id}`}>{t('Edit / unpublish', 'Editar / retirar publicación')}</Link>
        </div>}
        <UpdateCard post={post} />
      </div>)}
      <Pagination page={page} more={query.data?.hasMore || false} move={move} />
    </>}
  </>
}
export function MyProjects() {
  return <AuthGate><Projects /></AuthGate>
}
function Projects() {
  const {
      page,
      move
    } = usePage(),
    query = useJournalQuery<PageResult<Project>>(`projects?page=${page}`),
    user = useAuthStore(s => s.user),
    t = useJournalText()
  return <>
  <header className="journal-row">
    <h1>{t('My projects', 'Mis proyectos')}</h1>
    <Link className="journal-button" href="/projects/new">{t('Create project', 'Crear proyecto')}</Link>
  </header>
  {user && <Link href={profileHref(user.username)}>
    {t('View my public profile', 'Ver mi perfil público')}
    {' '}
    →
  </Link>}
  {query.loading ? <JournalLoading /> : query.error ? <QueryError error={query.error} retry={query.reload} /> : <>
    {!query.data?.items.length && <section className="journal-empty">
      <h2>{t('Start something worth focusing on.', 'Empieza algo que merezca tu atención.')}</h2>
      <Link href="/projects/new">{t('Create project', 'Crear proyecto')}</Link>
    </section>}
    <div className="journal-grid">
      {query.data?.items.map(project => <article key={project.id} className="journal-card">
        <div className="journal-row">
          <h2>{project.name}</h2>
          <span className="journal-badge">
            {project.visibility.toLowerCase()}
            {' '}
            ·
            {' '}
            {project.status.toLowerCase()}
          </span>
        </div>
        <p>{project.description}</p>
        <FocusStats stats={project.stats} />
        <div className="journal-actions">
          <Link href={`/projects/${project.id}/edit`}>{t('Edit project', 'Editar proyecto')}</Link>
          <Link href={`/journal/compose?project=${project.id}`}>{t('Post update', 'Publicar actualización')}</Link>
          {user && project.visibility === 'PUBLIC' && <Link href={`${profileHref(user.username)}/projects/${project.slug}`}>{t('View project', 'Ver proyecto')}</Link>}
          <FocusProjectButton userId={project.userId} projectId={project.id} name={project.name} />
        </div>
      </article>)}
    </div>
    <Pagination page={page} more={query.data?.hasMore || false} move={move} />
  </>}
  </>
}
export function Discover() {
  const {
      page,
      move
    } = usePage(),
    query = useJournalQuery<PageResult<Author & {
      description: string | null;
      _count: {
        followers: number;
      };
    }>>(`discover?page=${page}`),
    t = useJournalText()
  return <>
  <h1>{t('People building with focus', 'Personas que crean con enfoque')}</h1>
  <p>{t('Public projects, real work, and a little company.', 'Proyectos públicos, trabajo real y un poco de compañía.')}</p>
  {query.loading ? <JournalLoading /> : query.error ? <QueryError error={query.error} retry={query.reload} /> : <>
    <div className="journal-grid">
      {query.data?.items.map(user => <article className="journal-card" key={user.id}>
        <h2><Link href={profileHref(user.username)}>{user.displayName || user.username}</Link></h2>
        <p>{user.description}</p>
        <FollowButton userId={user.id} count={user._count.followers} />
      </article>)}
    </div>
    {!query.data?.items.length && <p>{t('No public projects here yet. Yours can be the first.', 'Aún no hay proyectos públicos. El tuyo puede ser el primero.')}</p>}
    <Pagination page={page} more={query.data?.hasMore || false} move={move} />
  </>}
  </>
}
export function MonthlyWrapped() {
  return <AuthGate><Monthly /></AuthGate>
}
function Monthly() {
  const wrapped = useWrapped(), t = useJournalText()
  return <section className="journal-form">
    <h1>{t('Monthly Wrapped', 'Resumen del mes')}</h1>
    <p>{t('Look back at your last completed month of focused work.', 'Repasa tu último mes completo de trabajo enfocado.')}</p>
    <button type="button" className="journal-button" disabled={!wrapped || wrapped.loading} onClick={() => { void wrapped?.openMonth() }}>
      {wrapped?.loading ? t('Loading your month…', 'Cargando tu mes…') : t('Open monthly recap', 'Abrir resumen mensual')}
    </button>
    <MonthlyRecaps />
  </section>
}
