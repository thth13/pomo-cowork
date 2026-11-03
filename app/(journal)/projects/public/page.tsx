import { Suspense } from 'react'
import PublicProjects from '@/components/journal/PublicProjects'
import { JournalLoading } from '@/components/journal/Primitives'
import { journalMetadata } from '@/lib/journal/metadata'

export const metadata = journalMetadata(
  'Public projects | Pomo Cowork',
  'Discover what people are building with focused work. Explore public projects, progress and activity.',
  '/projects/public',
  'website',
)

export default function Page() {
  return <Suspense fallback={<JournalLoading />}><PublicProjects /></Suspense>
}
