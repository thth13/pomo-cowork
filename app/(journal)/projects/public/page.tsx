import { Suspense } from 'react'
import PublicProjects from '@/components/journal/PublicProjects'
import PublicProjectsLoading from '@/components/journal/PublicProjectsLoading'
import { journalMetadata } from '@/lib/journal/metadata'

export const metadata = journalMetadata(
  'Public projects | Pomo Cowork',
  'Discover what people are building with focused work. Explore public projects, progress and activity.',
  '/projects/public',
  'website',
)

export default function Page() {
  return <Suspense fallback={<div className="project-catalog"><PublicProjectsLoading /></div>}><PublicProjects /></Suspense>
}
