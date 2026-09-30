import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { profileData, profileByUsername, pageNumber } from '@/lib/journal/queries'
import { journalMetadata } from '@/lib/journal/metadata'
import { usernameFromHandle } from '@/lib/journal/handles'
import { profileHref, Project, Post, duration } from '@/lib/journal/types'
import { json } from '@/lib/journal/server'
import ProfileAchievements from '@/components/achievements/ProfileAchievements'
import FollowButton from '@/components/journal/FollowButton'
import { ProjectCard, UpdateCard } from '@/components/journal/Cards'
import FocusHeatmap from '@/components/journal/FocusHeatmap'
import { OwnerActions } from '@/components/journal/Primitives'
export const dynamic = 'force-dynamic'
type Props = {
  params: {
    handle: string;
  };
  searchParams: {
    tab?: string;
    page?: string;
  };
};
export async function generateMetadata({
  params
}: Props) {
  const username = usernameFromHandle(params.handle)
  if (!username) return {
    robots: {
      index: false
    }
  }
  const user = await profileByUsername(username)
  if (!user) return {
    robots: {
      index: false
    }
  }
  const name = user.displayName || user.username
  return journalMetadata(`${name} — Projects & Focus | Pomo Cowork`, `See what ${name} is building, project milestones and focused work tracked with Pomo Cowork.`, profileHref(user.username))
}
export default async function ProfilePage({
  params,
  searchParams
}: Props) {
  const username = usernameFromHandle(params.handle)
  if (!username) notFound()
  const tab = ['projects', 'updates', 'activity', 'achievements'].includes(searchParams.tab || '') ? searchParams.tab! : 'projects',
    page = pageNumber(searchParams.page)
  const data = await profileData(username, tab, page)
  if (!data) notFound()
  const {
      user,
      stats
    } = data,
    base = profileHref(user.username)
  return <>
    <header className="journal-profile">
      {user.avatarUrl && <Image unoptimized width={80} height={80} className="journal-profile-avatar" src={user.avatarUrl} alt="" />}
      <div className="journal-profile-copy">
        <h1>{user.displayName || user.username}</h1>
        <p className="journal-muted">
          @
          {user.username}
          {user.location && ` · ${user.location}`}
        </p>
        {user.description && <p>{user.description}</p>}
        <div className="journal-actions">
          {[['Website', user.websiteUrl], ['GitHub', user.githubUrl], ['X', user.twitterUrl]].map(([label, url]) => url && <a key={label} href={url} rel="nofollow ugc noopener noreferrer">
            {label}
            {' '}
            ↗
          </a>)}
        </div>
        <small>
          Joined
          {user.createdAt.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC'
          })}
          {' '}
          ·
          {user._count.following}
          {' '}
          following
        </small>
      </div>
      <FollowButton userId={user.id} count={user._count.followers} />
    </header>
    <dl className="journal-stats">
      <div>
        <dt>Lifetime focus</dt>
        <dd>{duration(stats.seconds)}</dd>
      </div>
      <div>
        <dt>Total sessions</dt>
        <dd>{stats.sessions}</dd>
      </div>
      <div>
        <dt>Current streak</dt>
        <dd>
          {data.streak}
          {' '}
          days
        </dd>
      </div>
      <div>
        <dt>Public projects</dt>
        <dd>{data.projectCount}</dd>
      </div>
    </dl>
    <OwnerActions userId={user.id} />
    <nav className="journal-tabs" aria-label="Profile sections">{['projects', 'updates', 'activity', 'achievements'].map(name => <Link key={name} href={`${base}?tab=${name}`} aria-current={tab === name ? 'page' : undefined}>{name[0].toUpperCase() + name.slice(1)}</Link>)}</nav>
    <ProfileAchievements userId={user.id} />
    {tab !== 'achievements' && page === 1 && data.pinned && <ProjectCard project={((json(data.pinned) as unknown) as Project)} username={user.username} pinned latest={data.pinned.milestones[0]?.title} />}
    {tab === 'projects' && <div className="journal-grid">{data.projects.map(project => <ProjectCard key={project.id} project={((json(project) as unknown) as Project)} username={user.username} />)}</div>}
    {tab === 'projects' && !data.projects.length && <div className="journal-empty">
      <h2>Start something worth focusing on.</h2>
      <p>No public projects yet.</p>
      <Link href="/projects/new">Create project</Link>
    </div>}
    {tab === 'updates' && <>
      {data.posts.map(post => <UpdateCard key={post.id} post={((json(post) as unknown) as Post)} />)}
      {!data.posts.length && <div className="journal-empty">
        No published updates yet.
        <Link href="/journal/compose">Share what you have been working on.</Link>
      </div>}
    </>}
    {tab === 'activity' && <>
      <FocusHeatmap days={data.days} />
      <section className="journal-card">
        <h2>Meaningful moments</h2>
        {!data.activity.length && <p>Project milestones and focus achievements will appear here.</p>}
        <ol className="journal-timeline">
          {data.activity.map(event => <li key={event.id}>
            <time dateTime={event.createdAt.toISOString()}>{event.createdAt.toISOString().slice(0, 10)}</time>
            {event.post ? <Link href={`${base}/posts/${event.post.slug}`}>{event.post.title || 'Milestone'}</Link> : event.project ? <Link href={`${base}/projects/${event.project.slug}`}>
              {event.type === 'PROJECT_COMPLETED' ? 'Completed' : 'Started'}
              {' '}
              {event.project.name}
            </Link> : <span>{event.type === 'FOCUS_HOURS' ? `Reached ${event.value} focus hours` : event.type === 'SESSIONS' ? `Completed ${event.value} focus sessions` : `Reached a ${event.value}-day streak`}</span>}
          </li>)}
        </ol>
      </section>
    </>}
    {tab !== 'achievements' && <nav className="journal-pagination" aria-label="Pagination">
      {page > 1 && <Link href={`${base}?tab=${tab}&page=${page - 1}`}>Previous</Link>}
      {data.hasMore && <Link href={`${base}?tab=${tab}&page=${page + 1}`}>Next</Link>}
    </nav>}
  </>
}
