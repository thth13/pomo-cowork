'use client'

import { isJapaneseSeoPath } from '@/lib/japaneseSeoRoutes'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// The route language is present in the initial HTML, without making every page
// dynamic through request headers. Server-rendered children stay server components.
export default function DocumentHtml({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return <html lang={isJapaneseSeoPath(pathname) ? 'ja' : pathname === '/es' || pathname.startsWith('/es/') ? 'es' : 'en'} suppressHydrationWarning>{children}</html>
}
