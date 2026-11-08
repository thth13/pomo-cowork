'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { isJapaneseSeoPath } from '@/lib/japaneseSeoRoutes'

// Japanese acquisition pages own their local timer and Japanese UI. Do not mount
// account dialogs, translations, coworking timers or widgets on these pages.
export default function StandalonePageBoundary({ children, application }: { children: ReactNode; application: ReactNode }) {
  return isJapaneseSeoPath(usePathname()) ? children : application
}
