import { Suspense } from 'react'
import { Discover } from '@/components/journal/JournalLists'
import { JournalLoading } from '@/components/journal/Primitives'
import { privateMetadata } from '@/lib/journal/metadata'
export const metadata = {
  ...privateMetadata,
  title: 'Discover | Pomo Cowork'
}
export default function Page() {
  return <Suspense fallback={<JournalLoading />}><Discover /></Suspense>
}
