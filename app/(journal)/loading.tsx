'use client'

import { usePathname } from 'next/navigation'
import { MyProjectsLoading } from '@/components/MyProjects'
import { JournalLoading } from '@/components/journal/Primitives'
import PostComposerLoading from '@/components/journal/PostComposerLoading'

export default function JournalRouteLoading() {
  const pathname = usePathname()

  if (pathname === '/journal/compose') return <div className="project-editor-page personal-page-frame"><PostComposerLoading /></div>
  return pathname === '/projects' ? <MyProjectsLoading /> : <JournalLoading />
}
