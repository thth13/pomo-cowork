'use client'

import Link from 'next/link'
import { Eye, CalendarDays, Clock3, Flame, ListChecks, Sprout, Trophy, Globe, Github } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ProjectOverview } from '@/lib/journal/projectOverview'
import { Author, Project, duration, profileHref } from '@/lib/journal/types'
import { useJournalText } from '@/lib/journal/client'
import { useI18n } from '@/components/I18nProvider'
import { JournalImage, OwnerActions } from './Primitives'
import FollowButton from './FollowButton'
import ProjectViews from './ProjectViews'
import FocusHeatmap from './FocusHeatmap'

export default function PublicProjectView({ project, user, overview, tab, posts, timeline, about, pagination, milestone, preview = false, followControl }: {
  preview?: boolean
  followControl?: ReactNode
  project: Project
  user: Author
  overview: ProjectOverview
  tab: string
  posts: ReactNode
  timeline: ReactNode
  about: ReactNode
  pagination: ReactNode
  milestone: { title: string; slug: string; date: string } | null
}) {
  const t = useJournalText()
  const { language } = useI18n()
  const date = (value: string) => new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
  const number = (value: number) => new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value)
  const statuses = { PLANNING: t('Planning', 'Planificación'), BUILDING: t('Building', 'En desarrollo'), PAUSED: t('Paused', 'En pausa'), COMPLETED: t('Completed', 'Completado'), ARCHIVED: t('Archived', 'Archivado') }
  const progress = overview.totalTasks ? Math.round(overview.completedTasks / overview.totalTasks * 100) : 0
  const weekMax = Math.max(60, ...overview.week.map(d => d.minutes))
  const tasks = <section className="journal-card public-project-tasks">
    <div className="journal-row"><h2>{t('Working on now', 'En qué estamos trabajando')}</h2><span className="journal-muted">{overview.completedTasks} / {overview.totalTasks}</span></div>
    {!project.showTasks ? <p className="journal-muted">{t('Task names are private. Follow the project’s progress in the dev blog.', 'Los nombres de las tareas son privados. Sigue los avances en el blog.')}</p> : !overview.tasks.length ? <p className="journal-muted">{t('No tasks to show yet.', 'Aún no hay tareas para mostrar.')}</p> : <ul>{overview.tasks.slice(0, tab === 'overview' ? 5 : 20).map(task => <li key={task.id}><span className="public-task-check" data-done={task.completed} aria-label={task.completed ? t('Completed', 'Completada') : t('To do', 'Pendiente')}>{task.completed ? '✓' : '·'}</span><span className={task.completed ? 'public-task-done' : ''}>{task.title}</span></li>)}</ul>}
    {tab === 'overview' && overview.tasks.length > 5 && <Link href="?tab=tasks">{t('View all tasks →', 'Ver todas las tareas →')}</Link>}
  </section>
  const activity = <section className="journal-card">
    <div className="journal-row"><h2>{t('Recent work activity', 'Actividad reciente')}</h2><span className="journal-badge">{t('Synced with timer', 'Sincronizado con el temporizador')}</span></div>
    {!overview.recent.length && <p className="journal-muted">{t('The first focus session is still ahead.', 'La primera sesión de concentración está por venir.')}</p>}
    <ol className="public-project-activity">{overview.recent.map(item => <li key={item.id}><span className="public-activity-dot" aria-hidden="true" /><div><strong>{item.type === 'WORK' ? t('Worked on the project', 'Trabajo en el proyecto') : t('Tracked focused work', 'Trabajo enfocado registrado')}</strong><small>{duration(item.minutes * 60)} · {t('focused', 'de concentración')}</small></div><time dateTime={item.date}>{date(item.date)}</time></li>)}</ol>
  </section>
  return <article className="public-project">
    <Link className="public-project-back" href={preview ? '/projects' : profileHref(user.username)}>← {user.displayName || user.username}</Link>
    <header className="journal-card public-project-header">
      <div className="public-project-cover">{project.coverUrl ? <JournalImage src={project.coverUrl} alt={t('Project cover', 'Portada del proyecto')} /> : <div className="public-project-cover-default"><Sprout size={44} strokeWidth={1} aria-hidden="true" /><span>{t('A little focus. Real progress.', 'Un poco de enfoque. Avances reales.')}</span></div>}</div>
      <div className="public-project-identity">
        <div className="public-project-logo">{project.imageUrl ? <JournalImage src={project.imageUrl} alt={project.name} /> : <Sprout size={30} aria-hidden="true" />}</div>
        <div className="public-project-heading"><div className="public-project-title"><h1>{project.name}</h1><span className="journal-badge">{statuses[project.status]}</span></div><p className="journal-muted">{t('by', 'por')} <>{preview ? <span>{user.displayName || user.username}</span> : <Link href={profileHref(user.username)}>{user.displayName || user.username}</Link>}</></p><p>{project.description}</p></div>
        {preview ? followControl : <FollowButton userId={user.id} projectId={project.id} count={overview.followers} />}
      </div>
      <div className="public-project-meta">
        <span className="public-project-meta-item"><CalendarDays size={14} aria-hidden="true" />{t('Started', 'Inicio')} <time dateTime={project.startedAt}>{date(project.startedAt)}</time></span>
        {preview ? <span className="public-project-meta-item"><Eye size={14} aria-hidden="true" />{number(project.views)} {t('views', 'visitas')}</span> : <ProjectViews projectId={project.id} initial={project.views} />}
        {project.websiteUrl && <a className="public-project-meta-item" href={project.websiteUrl} target="_blank" rel="nofollow ugc noopener noreferrer"><Globe size={14} aria-hidden="true" />{t('Website', 'Sitio web')} ↗</a>}
        {project.githubUrl && <a className="public-project-meta-item" href={project.githubUrl} target="_blank" rel="nofollow ugc noopener noreferrer"><Github size={14} aria-hidden="true" />GitHub ↗</a>}
      </div>
      {!preview && <OwnerActions userId={user.id} projectId={project.id} />}
      <nav className="journal-tabs public-project-tabs" aria-label={t('Project sections', 'Secciones del proyecto')}>
        {[['overview', t('Overview', 'Resumen')], ['activity', t('Activity', 'Actividad')], ['tasks', t('Tasks', 'Tareas')], ['blog', t('Dev blog', 'Blog de desarrollo')]].map(([key, label]) => <Link key={key} href={`?tab=${key}`} aria-current={tab === key ? 'page' : undefined}>{label}</Link>)}
      </nav>
    </header>
    <dl className="public-project-stats">
      <div className="journal-card"><dt><Clock3 size={16} />{t('Total focus time', 'Tiempo de concentración')}</dt><dd>{number(overview.seconds / 3600)}<small> h</small></dd><small>{t('From project sessions', 'De las sesiones del proyecto')}</small></div>
      <div className="journal-card"><dt><Sprout size={16} />{t('Pomodoros', 'Pomodoros')}</dt><dd>{number(overview.pomodoros)}</dd><small>{t('Completed focus sessions', 'Sesiones Pomodoro completadas')}</small></div>
      <div className="journal-card"><dt><ListChecks size={16} />{t('Tasks completed', 'Tareas completadas')}</dt><dd>{overview.completedTasks}<small> / {overview.totalTasks}</small></dd><small>{progress}% {t('completion', 'completado')}</small></div>
      <div className="journal-card"><dt><Flame size={16} />{t('Current streak', 'Racha actual')}</dt><dd>{overview.streak}<small> {t('days', 'días')}</small></dd><small>{t('Project focus · UTC', 'Enfoque del proyecto · UTC')}</small></div>
    </dl>
    <div className="public-project-columns"><div className="public-project-main">
      {(tab === 'overview' || tab === 'blog') && <section><h2 className="public-project-section-title">{tab === 'blog' ? t('Dev blog', 'Blog de desarrollo') : t('Latest from the builder', 'Lo último del creador')}</h2>{posts}{tab === 'overview' && <Link href="?tab=blog">{t('View all updates →', 'Ver todas las actualizaciones →')}</Link>}</section>}
      {(tab === 'overview' || tab === 'tasks') && tasks}
      {(tab === 'overview' || tab === 'activity') && activity}
      {tab === 'activity' && timeline}
      {tab !== 'overview' && pagination}
    </div><aside className="public-project-sidebar">
      <section className="journal-card"><h2><Trophy size={16} aria-hidden="true" /> {t('Latest milestone', 'Último hito')}</h2>{milestone ? <><Link href={preview ? `?tab=blog#${milestone.slug}` : `${profileHref(user.username)}/posts/${milestone.slug}`}><strong>{milestone.title}</strong></Link><p className="journal-muted"><time dateTime={milestone.date}>{date(milestone.date)}</time></p></> : <p className="journal-muted">{t('Every project starts somewhere. The first milestone is ahead.', 'Todo proyecto tiene un comienzo. El primer hito está por llegar.')}</p>}<div className="journal-row"><small>{t('Task progress', 'Progreso de tareas')}</small><strong>{progress}%</strong></div><progress max={Math.max(1, overview.totalTasks)} value={overview.completedTasks} aria-label={t('Task progress', 'Progreso de tareas')} /></section>
      <section className="journal-card"><h2>{t('Focus this week', 'Enfoque esta semana')}</h2><div className="public-project-week">{overview.week.map(day => <div key={day.date}><span title={`${date(day.date)}: ${duration(day.minutes * 60)}`}><i style={{ height: `${day.minutes / weekMax * 100}%` }} /></span><small>{new Intl.DateTimeFormat(language, { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(day.date))}</small><span className="sr-only">{date(day.date)}: {duration(day.minutes * 60)}</span></div>)}</div><p className="journal-muted">{number(overview.week.reduce((sum, day) => sum + day.minutes, 0) / 60)} h · UTC</p></section>
      <FocusHeatmap days={overview.days} />
      <section className="journal-card"><h2>{t('About this project', 'Acerca del proyecto')}</h2>{about}</section>
    </aside></div>
  </article>
}
