'use client'
import { projectStatusLabels } from '@/lib/journal/projectStatus'

import Link from 'next/link'
import Image from 'next/image'
import { Clock3, Sprout, Timer } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import MonthlyRecaps from '@/components/wrapped/MonthlyRecaps'
import { useWrapped } from '@/components/wrapped/WrappedProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useJournalQuery, useJournalText } from '@/lib/journal/client'
import { PageResult, Post, Project, Author, profileHref } from '@/lib/journal/types'
import { AuthGate, JournalLoading, QueryError } from './Primitives'
import { UpdateCard } from './Cards'
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
  return <section className="journal-posts">
    <header className="journal-card journal-posts-header">
    <div className="journal-row journal-posts-heading">
      <h1>{mode === 'feed' ? t('From projects and people you follow', 'De los proyectos y personas que sigues') : t('Your updates', 'Tus actualizaciones')}</h1>
      <Link className="journal-button" href="/journal/compose">{t('Post update', 'Publicar actualización')}</Link>
    </div>
    <div className="journal-actions journal-posts-shortcuts">
      <Link href="/discover">{t('Discover people', 'Descubrir personas')}</Link>
      <Link href="/journal/monthly">{t('Monthly Wrapped', 'Resumen del mes')}</Link>
    </div>
    </header>
    {query.loading ? <div className="journal-card journal-posts-state"><JournalLoading /></div> : query.error ? <div className="journal-card journal-posts-state"><QueryError error={query.error} retry={query.reload} /></div> : <>
      {query.data?.items.length === 0 && <section className="journal-card journal-empty journal-posts-empty">
        <h2>{mode === 'feed' ? t('Follow people to see what they are building.', 'Sigue a personas para ver lo que están creando.') : t('Share what you have been working on.', 'Comparte en qué has estado trabajando.')}</h2>
        <Link className="journal-button secondary" href={mode === 'feed' ? '/discover' : '/journal/compose'}>{mode === 'feed' ? t('Discover people', 'Descubrir personas') : t('Post update', 'Publicar actualización')}</Link>
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
  </section>
}
export function MyProjects() {
  return <AuthGate><Projects /></AuthGate>
}
function Projects() {
  const { language } = useI18n()
  const number = (value: number) => new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value)
  const {
      page,
      move
    } = usePage(),
    query = useJournalQuery<PageResult<Project>>(`projects?page=${page}`),
    user = useAuthStore(s => s.user),
    t = useJournalText()
  if (!query.loading && !query.error && query.data?.items.length === 0 && page === 1) {
    return <div className="project-blogs-create-only">
      <Link className="journal-button secondary" href="/projects/public/new">{t('Make project blog', 'Crear blog del proyecto')}</Link>
    </div>
  }
  return <>
  <header className="journal-row project-blogs-heading">
    <h2>{t('Project blogs', 'Blogs de proyectos')}</h2>
    <Link className="journal-button secondary" href="/projects/public/new">{t('Make project blog', 'Crear blog del proyecto')}</Link>
  </header>
  {query.loading ? <JournalLoading /> : query.error ? <QueryError error={query.error} retry={query.reload} /> : <>
    <div className="project-blog-cards project-catalog-grid">
      {query.data?.items.map(project => <article key={project.id} className="journal-card project-catalog-card">
        <header className="project-catalog-header">
          <div className="project-catalog-identity">
            <div className="project-catalog-logo" aria-hidden="true">
              {project.imageUrl ? <Image unoptimized src={project.imageUrl} width={44} height={44} alt="" loading="lazy" /> : <Sprout size={24} />}
            </div>
            <div className="project-catalog-copy">
              <h2><Link className="project-catalog-link" href={user && project.visibility === 'PUBLIC' ? `${profileHref(user.username)}/projects/${project.slug}` : `/projects/${project.id}/edit`}>{project.name}</Link></h2>
              <span className="journal-badge" data-status={project.status}>{projectStatusLabels(t)[project.status]}</span>
              <span className="project-blog-visibility">{project.visibility === 'PUBLIC' ? t('Public', 'Público') : t('Private', 'Privado')}</span>
            </div>
          </div>
          {project.description && <p className="project-catalog-description" title={project.description}>{project.description}</p>}
        </header>
        <dl className="project-catalog-metrics project-blog-metrics">
          <div><dt><Clock3 size={13} aria-hidden="true" /><span>{t('in focus', 'de enfoque')}</span></dt><dd>{number(project.stats.seconds / 3600)} <small>h</small></dd></div>
          <div><dt><Timer size={13} aria-hidden="true" /><span>{t('sessions', 'sesiones')}</span></dt><dd>{number(project.stats.sessions)}</dd></div>
        </dl>
        <footer className="project-catalog-footer project-blog-actions">
          <div className="project-blog-links">
            <Link href={`/projects/${project.id}/edit`}>{t('Edit project', 'Editar proyecto')}</Link>
            <Link href={`/journal/compose?project=${project.id}`}>{t('Post update', 'Publicar actualización')}</Link>
            {user && project.visibility === 'PUBLIC' && <Link href={`${profileHref(user.username)}/projects/${project.slug}`}>{t('View project', 'Ver proyecto')} ↗</Link>}
          </div>
          <FocusProjectButton userId={project.userId} projectId={project.id} name={project.name} />
        </footer>
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
