import Link from 'next/link'
import Image from 'next/image'
import { Project, Post, Milestone, Stats, duration, profileHref, postHref } from '@/lib/journal/types'
import Markdown from './Markdown'
import PostInteractions from './PostInteractions'
import { JournalImage, OwnerActions } from './Primitives'
export function FocusStats({
  stats
}: {
  stats: Stats;
}) {
  return <dl className="journal-stats">
  <div>
    <dt>Focused work</dt>
    <dd>{duration(stats.seconds)}</dd>
  </div>
  <div>
    <dt>Sessions</dt>
    <dd>{stats.sessions.toLocaleString('en-US')}</dd>
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
    {pinned && <p className="journal-eyebrow">Currently building</p>}
    {project.imageUrl && <JournalImage src={project.imageUrl} alt={project.name} />}
    <div className="journal-row">
      <h3><Link href={`${profileHref(username)}/projects/${project.slug}`}>{project.name}</Link></h3>
      <span className="journal-badge">{project.status.toLowerCase()}</span>
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
  const publicEntry = post.visibility === 'PUBLIC' && Boolean(post.publishedAt) && (!post.project || post.project.visibility === 'PUBLIC')
  const url = publicEntry ? postHref(post) : `/journal/compose?edit=${post.id}`
  return <article className="journal-card journal-update">
    <header className="journal-row">
      <div className="journal-author">
        {post.author.avatarUrl && <Image unoptimized src={post.author.avatarUrl} width={36} height={36} alt="" loading="lazy" />}
        <div>
          <Link href={profileHref(post.author.username)}>{post.author.displayName || post.author.username}</Link>
          <small>
            @
            {post.author.username}
          </small>
        </div>
      </div>
      <span className="journal-badge">{post.type.replaceAll('_', ' ').toLowerCase()}</span>
    </header>
    {post.project && <p><Link href={post.project.visibility === 'PUBLIC' ? `${profileHref(post.author.username)}/projects/${post.project.slug}` : `/projects/${post.project.id}/edit`}>{post.project.name}</Link></p>}
    {post.milestone ? <MilestoneCard milestone={post.milestone} projectName={post.project?.name || ''} showStats={post.showFocusStats} /> : post.title && <h2><Link href={url}>{post.title}</Link></h2>}
    <Markdown content={full ? post.content : post.content.slice(0, 650)} />
    {!full && post.content.length > 650 && <Link href={url}>Read the update →</Link>}
    {post.images.slice(0, full ? 4 : 1).map((src, i) => <JournalImage key={src} src={src} alt={`${post.title || 'Project update'} — image ${i + 1}`} />)}
    {post.showFocusStats && !post.milestone && <>
      <FocusStats stats={{
        seconds: post.focusedSecondsSnapshot || 0,
        sessions: post.sessionsSnapshot || 0
      }} />
      {post.statsFrom && <small>
        {post.statsFrom.slice(0, 10)}
        {' '}
        —
        {' '}
        {post.statsTo?.slice(0, 10)}
        {' '}
        · UTC
      </small>}
    </>}
    <p className="journal-muted">
      <Link href={url}><time dateTime={post.publishedAt || post.createdAt}>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', {
            timeZone: 'UTC',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }) : 'Draft'}</time></Link>
      {post.editedAt && ' · Edited'}
    </p>
    {full && <OwnerActions userId={post.authorId} postId={post.id} />}
    <PostInteractions postId={post.id} count={post._count.reactions} comments={post._count.comments} />
  </article>
}
