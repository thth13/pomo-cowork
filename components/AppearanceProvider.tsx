'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import WorkspaceBackground from '@/components/WorkspaceBackground'
import { APPEARANCE_STORAGE_KEY, useAppearanceStore } from '@/store/useAppearanceStore'

const sceneryRoutes = /^\/(?:rooms|leaderboard|stats|statistics|habits|profile|user|ranks|settings|feed|discover|journal|projects)(?:\/|$)/

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const backgroundId = useAppearanceStore(state => state.backgroundId)
  useEffect(() => {
    useAppearanceStore.getState().hydrate()
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === APPEARANCE_STORAGE_KEY || event.key === null)) {
        useAppearanceStore.getState().restore(event.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return <>
    {backgroundId !== 'default' && sceneryRoutes.test(pathname) &&
      <div className="product-scenery" aria-hidden="true"><WorkspaceBackground /></div>}
    {children}
  </>
}
