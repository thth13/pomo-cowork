'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Clock3, Sprout, Timer, Users } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { useJournalQuery, useJournalText } from '@/lib/journal/client'
import { projectStatusLabels } from '@/lib/journal/projectStatus'
import { PageResult, PublicProjectListing, profileHref } from '@/lib/journal/types'
import { QueryError } from './Primitives'
import PublicProjectsLoading from './PublicProjectsLoading'
import FollowButton from './FollowButton'

function CatalogCard({ project }: { project: PublicProjectListing }) {
  const t = useJournalText()
  const { language } = useI18n()
  const number = (value: number) => new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value)
  const { stats, author } = project
  const [followers, setFollowers] = useState(stats.followers)
  useEffect(() => setFollowers(stats.followers), [stats.followers])
  const progress = stats.totalTasks ? Math.round(stats.completedTasks / stats.totalTasks * 100) : 0
  const weekMax = Math.max(60, ...stats.week.map(day => day.minutes))
  const date = new Intl.DateTimeFormat(language, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(project.startedAt))
  return <article className="journal-card project-catalog-card">
    <header className="project-catalog-header">
    <div className="project-catalog-identity">
      <div className="project-catalog-logo" aria-hidden="true">
        {project.imageUrl ? <Image unoptimized src={project.imageUrl} width={56} height={56} alt="" loading="lazy" /> : <Sprout size={28} aria-hidden="true" />}
      </div>
      <div className="project-catalog-copy">
        <h2><Link className="project-catalog-link" href={`${profileHref(author.username)}/projects/${project.slug}`}>{project.name}</Link></h2>
        <span className="journal-badge" data-status={project.status}>{projectStatusLabels(t)[project.status]}</span>
      </div>
    </div>
    {project.description && <p className="project-catalog-description" title={project.description}>{project.description}</p>}
      <FollowButton userId={project.userId} projectId={project.id} count={stats.followers} variant="bookmark" onCountChange={setFollowers} />
    </header>
    <div className="project-catalog-progress">
      <div><span>{t('Task progress', 'Progreso de tareas')}</span><strong>{number(progress)}%</strong></div>
      <progress max={Math.max(1, stats.totalTasks)} value={stats.completedTasks} aria-label={t('Task progress', 'Progreso de tareas')} />
    </div>
    <div className="project-catalog-activity">
      <dl className="project-catalog-metrics">
        <div><dt><Timer size={17} aria-hidden="true" /><span>{t('pomodoros', 'pomodoros')}</span></dt><dd>{number(stats.pomodoros)}</dd></div>
        <div><dt><Clock3 size={17} aria-hidden="true" /><span>{t('in focus', 'de enfoque')}</span></dt><dd>{number(stats.seconds / 3600)} <small>h</small></dd></div>
        <div><dt><Check size={19} aria-hidden="true" /><span>{t('tasks', 'tareas')}</span></dt><dd>{number(stats.completedTasks)}<small> / {number(stats.totalTasks)}</small></dd></div>
      </dl>
      <div className="project-catalog-week-row">
        <span className="project-catalog-week-label">{t('This week', 'Esta semana')}</span>
        <div className="project-catalog-week" role="img" aria-label={`${t('Focus time this week', 'Tiempo de enfoque esta semana')}: ${number(stats.week.reduce((total, day) => total + day.minutes, 0))} min`}>
          {stats.week.map(day => <span key={day.date} title={`${day.date}: ${number(day.minutes)} min`}><i style={{ height: `${day.minutes / weekMax * 100}%` }} /></span>)}
        </div>
      </div>
    </div>
    <footer className="project-catalog-footer">
      <Link href={profileHref(author.username)} className="project-catalog-author">
        {author.avatarUrl ? <Image unoptimized src={author.avatarUrl} width={28} height={28} alt="" loading="lazy" /> : <span className="project-catalog-avatar" aria-hidden="true">{(author.displayName || author.username).slice(0, 1).toUpperCase()}</span>}
        <span className="project-catalog-author-details">
          <span>{author.displayName || author.username}</span>
          <time dateTime={project.startedAt} title={date}>{t('Since', 'Desde')} {date}</time>
        </span>
      </Link>
      <span className="project-catalog-followers" title={t('Project followers', 'Seguidores del proyecto')}><Users size={16} aria-hidden="true" /><span>{number(followers)}</span><span className="sr-only"> {t('followers', 'seguidores')}</span></span>
    </footer>
  </article>
}

export default function PublicProjects() {
  const t = useJournalText()
  const router = useRouter()
  const params = useSearchParams()
  const page = Math.min(10000, Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1))
  const change = (values: Record<string, string>) => {
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries(values)) {
      if (!value || value === 'all') next.delete(key)
      else next.set(key, value)
    }
    router.push(`/projects/public${next.size ? `?${next}` : ''}`, { scroll: false })
  }
  const queryParams = new URLSearchParams({ page: String(page) })
  const query = useJournalQuery<PageResult<PublicProjectListing> & { total: number }>(`public-projects?${queryParams}`)

  return <section className="project-catalog" aria-labelledby="public-projects-title">
    <h1 id="public-projects-title" className="sr-only">{t('Public projects', 'Proyectos públicos')}</h1>
    <div className="project-catalog-content" aria-busy={query.loading}>
      {query.loading ? <PublicProjectsLoading /> : query.error ? <div className="journal-card project-catalog-state"><QueryError error={query.error} retry={query.reload} /></div> : query.data?.items.length ? <div className="project-catalog-grid">{query.data.items.map(project => <CatalogCard key={project.id} project={project} />)}</div> : <section className="journal-card journal-empty project-catalog-empty"><Sprout size={32} aria-hidden="true" /><h2>{page > 1 ? t('No more projects on this page', 'No hay más proyectos en esta página') : t('The next project could be yours', 'El próximo proyecto podría ser el tuyo')}</h2><p>{t('Share a public project and let others follow your progress.', 'Comparte un proyecto público y permite que otros sigan tus avances.')}</p>{page > 1 ? <button className="journal-button secondary" onClick={() => change({ page: '1' })}>{t('Back to first page', 'Volver a la primera página')}</button> : <Link className="journal-button" href="/projects/public/new">{t('Share your project', 'Comparte tu proyecto')}</Link>}</section>}
    </div>
    {!query.loading && !query.error && (page > 1 || query.data?.hasMore) && <nav className="project-catalog-pagination" aria-label={t('Project pages', 'Páginas de proyectos')}><button type="button" disabled={page <= 1} onClick={() => change({ page: String(page - 1) })}><ArrowLeft size={16} aria-hidden="true" />{t('Previous', 'Anterior')}</button><span>{t('Page', 'Página')} {page}</span><button type="button" disabled={!query.data?.hasMore} onClick={() => change({ page: String(page + 1) })}>{t('Next', 'Siguiente')}<ArrowRight size={16} aria-hidden="true" /></button></nav>}
  </section>
}
