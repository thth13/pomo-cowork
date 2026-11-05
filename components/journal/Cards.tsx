'use client'

import { CalendarDays, Clock3, FileText, FolderOpen, Timer, Trophy } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { useJournalText } from '@/lib/journal/client'
import Link from 'next/link'
import Image from 'next/image'
import { Project, Post, Milestone, Stats, duration, profileHref, postHref } from '@/lib/journal/types'
import Markdown from './Markdown'
import PostInteractions from './PostInteractions'
import { JournalImage, OwnerActions } from './Primitives'
import { ProjectStatusLabel } from './PublicProjectLabels'
export function FocusStats({
  stats
}: {
  stats: Stats;
}) {
  const t = useJournalText()
  const { language } = useI18n()
  return <dl className="journal-stats">
  <div>
    <dt><Clock3 size={15} aria-hidden="true" />{t('Focus time', 'Tiempo de enfoque')}</dt>
    <dd>{duration(stats.seconds)}</dd>
  </div>
  <div>
    <dt><Timer size={15} aria-hidden="true" />{t('Sessions', 'Sesiones')}</dt>
    <dd>{stats.sessions.toLocaleString(language)}</dd>
  </div>
  </dl>
}
export function ProjectCard({
  project,
  username,
  pinned = false,
  latest
}: {
  project: Project;
  username: string;
  pinned?: boolean;
  latest?: string;
}) {
  return <article className={`journal-card ${pinned ? 'journal-pinned' : ''}`}>
    {pinned && <p className="journal-eyebrow">Pinned project</p>}
    {project.imageUrl && <JournalImage src={project.imageUrl} alt={project.name} />}
    <div className="journal-row">
      <h3><Link href={`${profileHref(username)}/projects/${project.slug}`}>{project.name}</Link></h3>
      <span className="journal-badge"><ProjectStatusLabel status={project.status} /></span>
    </div>
    <p>{project.description}</p>
    <FocusStats stats={project.stats} />
    {latest && <p>
      Latest milestone:
      <strong>{latest}</strong>
    </p>}
    <Link href={`${profileHref(username)}/projects/${project.slug}`}>View project →</Link>
  </article>
}
export function MilestoneCard({
  milestone,
  projectName,
  showStats = true
}: {
  milestone: Milestone;
  projectName: string;
  showStats?: boolean;
}) {
  return <section className="journal-milestone">
    <p className="journal-eyebrow">
      Milestone ·
      {projectName}
    </p>
    <h2>{milestone.title}</h2>
    {showStats && <>
      <strong>
        {duration(milestone.focusedSecondsSnapshot)}
        {' '}
        of focus
      </strong>
      <p>
        {milestone.sessionsSnapshot}
        {' '}
        sessions before this milestone
      </p>
    </>}
    <small>Built with Pomo Cowork</small>
  </section>
}
export function UpdateCard({
  post,
  full = false
}: {
  post: Post;
  full?: boolean;
}) {
  const t = useJournalText()
  const { language } = useI18n()
  const date = (value: string) => new Date(value).toLocaleDateString(language, { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' })
  const TypeIcon = post.type === 'MILESTONE' ? Trophy : post.type === 'WEEKLY_UPDATE' ? CalendarDays : FileText
  const typeLabel = post.type === 'MILESTONE' ? t('Milestone', 'Hito') : post.type === 'WEEKLY_UPDATE' ? t('Weekly update', 'Resumen semanal') : t('Project update', 'Actualización')
  const publicEntry = post.visibility === 'PUBLIC' && Boolean(post.publishedAt) && (!post.project || post.project.visibility === 'PUBLIC')
  const url = publicEntry ? postHref(post) : `/journal/compose?edit=${post.id}`
  return <article className="journal-card journal-update">
    <header className="journal-update-header">
      <div className="journal-author">
        {post.author.avatarUrl ? <Image unoptimized src={post.author.avatarUrl} width={36} height={36} alt="" loading="lazy" /> : <span className="journal-update-avatar" aria-hidden="true">{(post.author.displayName || post.author.username).slice(0, 1).toUpperCase()}</span>}
        <div>
          <Link href={profileHref(post.author.username)}>{post.author.displayName || post.author.username}</Link>
          <small>
            @
            {post.author.username}
          </small>
        </div>
      </div>
      <span className="journal-badge journal-update-type"><TypeIcon size={14} aria-hidden="true" />{typeLabel}</span>
    </header>
    {post.project && <p className="journal-update-project"><FolderOpen size={16} aria-hidden="true" /><span>{t('Project', 'Proyecto')}</span><Link href={post.project.visibility === 'PUBLIC' ? `${profileHref(post.author.username)}/projects/${post.project.slug}` : `/projects/${post.project.id}/edit`}>{post.project.name}</Link></p>}
    <div className="journal-update-content">
    {post.milestone ? <MilestoneCard milestone={post.milestone} projectName={post.project?.name || ''} showStats={post.showFocusStats} /> : post.title && <h2><Link href={url}>{post.title}</Link></h2>}
    <Markdown content={full ? post.content : post.content.slice(0, 650)} />
    {!full && post.content.length > 650 && <Link href={url}>Read the update →</Link>}
    {post.images.slice(0, full ? 4 : 1).map((src, i) => <JournalImage key={src} src={src} alt={`${post.title || 'Project update'} — image ${i + 1}`} />)}
    </div>
    {post.showFocusStats && !post.milestone && <section className="journal-update-focus" aria-label={t('Focus statistics', 'Estadísticas de enfoque')}>
      <FocusStats stats={{
        seconds: post.focusedSecondsSnapshot || 0,
        sessions: post.sessionsSnapshot || 0
      }} />
      {post.statsFrom && <p className="journal-update-period"><CalendarDays size={14} aria-hidden="true" /><span>{t('Tracked period', 'Período registrado')}: {date(post.statsFrom)}{post.statsTo ? ` — ${date(post.statsTo)}` : ''} · UTC</span></p>}
    </section>}
    <p className="journal-update-date">
      <CalendarDays size={14} aria-hidden="true" />
      <Link href={url}>{post.publishedAt ? <>{t('Published', 'Publicado')} <time dateTime={post.publishedAt}>{date(post.publishedAt)}</time></> : t('Draft', 'Borrador')}</Link>
      {post.editedAt && <span>· {t('Edited', 'Editado')}</span>}
    </p>
    {full && <OwnerActions userId={post.authorId} postId={post.id} />}
    <PostInteractions postId={post.id} count={post._count.reactions} comments={post._count.comments} />
  </article>
}
