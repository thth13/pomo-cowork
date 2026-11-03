import Link from 'next/link'
import { notFound } from 'next/navigation'
import { publicProjectData, pageNumber } from '@/lib/journal/queries'
import { journalMetadata } from '@/lib/journal/metadata'
import { usernameFromHandle } from '@/lib/journal/handles'
import { profileHref, Post, Project } from '@/lib/journal/types'
import { json } from '@/lib/journal/server'
import { UpdateCard } from '@/components/journal/Cards'
import ProjectTimeline from '@/components/journal/ProjectTimeline'
import Markdown from '@/components/journal/Markdown'
import PublicProjectView from '@/components/journal/PublicProjectView'
import { ProjectEmpty, ProjectPaginationLabel } from '@/components/journal/PublicProjectLabels'
export const dynamic = 'force-dynamic'
type Props = {
  params: {
    handle: string;
    slug: string;
  };
  searchParams: {
    page?: string;
    tab?: string;
  };
};
export async function generateMetadata({
  params
}: Props) {
  const username = usernameFromHandle(params.handle)
  const data = username ? await publicProjectData(username, params.slug, 1) : null
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
  const username = usernameFromHandle(params.handle)
  if (!username) notFound()
  const page = pageNumber(searchParams.page),
    data = await publicProjectData(username, params.slug, page)
  if (!data) notFound()
  const { user, project, overview } = data
  const tab = ['overview', 'activity', 'tasks', 'map', 'blog'].includes(searchParams.tab || '') ? searchParams.tab! : 'overview'
  const hasMore = (tab === 'tasks' || tab === 'map') ? overview.moreTasks : tab === 'activity' ? data.moreTimeline : data.morePosts
  const posts = tab === 'overview' ? data.posts.slice(0, 2) : data.posts
  return <PublicProjectView
    user={user}
    project={json({ ...project, stats: data.stats }) as unknown as Project}
    overview={overview}
    tab={tab}
    milestone={data.milestone ? { title: data.milestone.milestone?.title || data.milestone.title || 'Milestone', slug: data.milestone.slug, date: (data.milestone.milestone?.achievedAt || data.milestone.publishedAt!).toISOString() } : null}
    posts={<>{posts.map(post => <UpdateCard key={post.id} post={json(post) as unknown as Post} />)}{!posts.length && <ProjectEmpty />}</>}
    timeline={<ProjectTimeline base={profileHref(user.username)} startedAt={project.startedAt.toISOString()} entries={json(data.timeline) as unknown as Parameters<typeof ProjectTimeline>[0]['entries']} />}
    about={<Markdown content={project.content || project.description} />}
    pagination={<nav className="journal-pagination" aria-label="Pagination">
      {page > 1 && <Link href={`?tab=${tab}&page=${page - 1}`}><ProjectPaginationLabel previous /></Link>}
      {hasMore && <Link href={`?tab=${tab}&page=${page + 1}`}><ProjectPaginationLabel /></Link>}
    </nav>}
  />
}
