'use client'

import { usePathname } from 'next/navigation'
import { MyProjectsLoading } from '@/components/MyProjects'
import { JournalLoading } from '@/components/journal/Primitives'

export default function JournalRouteLoading() {
  const pathname = usePathname()

  return pathname === '/projects' ? <MyProjectsLoading /> : <JournalLoading />
}
