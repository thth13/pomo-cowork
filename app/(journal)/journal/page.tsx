import { Suspense } from 'react'
import { MyUpdates } from '@/components/journal/JournalLists'
import { JournalLoading } from '@/components/journal/Primitives'
import { privateMetadata } from '@/lib/journal/metadata'
export const metadata = {
  ...privateMetadata,
  title: 'MyUpdates | Pomo Cowork'
}
export default function Page() {
  return <Suspense fallback={<JournalLoading />}><MyUpdates /></Suspense>
}
