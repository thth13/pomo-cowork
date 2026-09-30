import { Suspense } from 'react'
import { MyProjects } from '@/components/journal/JournalLists'
import { JournalLoading } from '@/components/journal/Primitives'
import { privateMetadata } from '@/lib/journal/metadata'
export const metadata = {
  ...privateMetadata,
  title: 'MyProjects | Pomo Cowork'
}
export default function Page() {
  return <Suspense fallback={<JournalLoading />}><MyProjects /></Suspense>
}
