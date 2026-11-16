'use client'

import { isJapaneseSeoPath } from '@/lib/japaneseSeoRoutes'
import { useAppearanceStore } from '@/store/useAppearanceStore'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// The route language is present in the initial HTML, without making every page
// dynamic through request headers. Server-rendered children stay server components.
export default function DocumentHtml({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const backgroundId = useAppearanceStore(state => state.backgroundId)
  const windowDesign = useAppearanceStore(state => state.windowDesign)
  // React owns these attributes so refresh/remount cleanup cannot remove the
  // selected material while the appearance store still shows it as selected.
  return <html
    lang={isJapaneseSeoPath(pathname) ? 'ja' : pathname === '/es' || pathname.startsWith('/es/') ? 'es' : 'en'}
    data-background={backgroundId}
    data-window-design={windowDesign}
    suppressHydrationWarning
  >{children}</html>
}
