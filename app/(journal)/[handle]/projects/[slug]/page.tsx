import Link from 'next/link'
import { notFound } from 'next/navigation'
import { publicProjectData, pageNumber } from '@/lib/journal/queries'
import { journalMetadata } from '@/lib/journal/metadata'
import { profileHref, Post } from '@/lib/journal/types'
import { json } from '@/lib/journal/server'
import { FocusStats, UpdateCard } from '@/components/journal/Cards'
import ProjectTimeline from '@/components/journal/ProjectTimeline'
import Markdown from '@/components/journal/Markdown'
import { JournalImage, OwnerActions } from '@/components/journal/Primitives'
import { FocusProjectButton } from '@/components/journal/ProjectPicker'
export const dynamic = 'force-dynamic'
type Props = {
  params: {
    handle: string;
    slug: string;
  };
  searchParams: {
    page?: string;
  };
};
export async function generateMetadata({
  params
}: Props) {
  const data = params.handle.startsWith('@') ? await publicProjectData(params.handle.slice(1), params.slug) : null
  return data ? journalMetadata(`${data.project.name} by ${data.user.displayName || data.user.username} — Project Journal`, data.project.description || `Follow the focused work behind ${data.project.name}.`, `${profileHref(data.user.username)}/projects/${data.project.slug}`, 'website') : {
    robots: {
      index: false
    }
  }
}
export default async function ProjectPage({
  params,
  searchParams
}: Props) {
  if (!params.handle.startsWith('@')) notFound()
  const page = pageNumber(searchParams.page),
    data = await publicProjectData(params.handle.slice(1), params.slug, page)
  if (!data) notFound()
  const {
      user,
      project,
      stats
    } = data,
    base = profileHref(user.username)
  return <>
    <Link href={base}>
      ←
      {user.displayName || user.username}
    </Link>
    <header className="journal-card">
      <div className="journal-row">
        <h1>{project.name}</h1>
        <span className="journal-badge">{project.status.toLowerCase()}</span>
      </div>
      <p>{project.description}</p>
      {project.imageUrl && <JournalImage src={project.imageUrl} alt={project.name} />}
      <FocusStats stats={stats} />
      <p className="journal-muted">
        Started
        {project.startedAt.toISOString().slice(0, 10)}
        {project.completedAt && ` · Completed ${project.completedAt.toISOString().slice(0, 10)}`}
      </p>
      <div className="journal-actions">
        {project.websiteUrl && <a href={project.websiteUrl} rel="nofollow ugc noopener noreferrer">Website ↗</a>}
        {project.githubUrl && <a href={project.githubUrl} rel="nofollow ugc noopener noreferrer">GitHub ↗</a>}
        <FocusProjectButton userId={user.id} projectId={project.id} name={project.name} />
      </div>
      <OwnerActions userId={user.id} projectId={project.id} />
    </header>
    {project.content && <section className="journal-card">
      <h2>About this project</h2>
      <Markdown content={project.content} />
    </section>}
    <ProjectTimeline base={base} startedAt={project.startedAt.toISOString()} entries={((json(data.timeline) as unknown) as Parameters<typeof ProjectTimeline>[0]['entries'])} />
    <h2>Updates</h2>
    {data.posts.map(post => <UpdateCard key={post.id} post={((json(post) as unknown) as Post)} />)}
    {!data.posts.length && <div className="journal-empty">This project’s next chapter is still being written.</div>}
    <nav className="journal-pagination" aria-label="Pagination">
      {page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}
      {data.hasMore && <Link href={`?page=${page + 1}`}>Next</Link>}
    </nav>
  </>
}
