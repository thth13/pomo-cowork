'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import WorkspaceBackground from '@/components/WorkspaceBackground'
import { APPEARANCE_STORAGE_KEY, useAppearanceStore } from '@/store/useAppearanceStore'
import { useAuthStore } from '@/store/useAuthStore'

const sceneryRoutes = /^\/(?:rooms|leaderboard|stats|statistics|habits|profile|user|ranks|settings|feed|discover|journal|projects)(?:\/|$)/

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const backgroundId = useAppearanceStore(state => state.backgroundId)
  useEffect(() => {
    useAppearanceStore.getState().hydrate()
    let expiryTimeout: number | undefined
    const syncAccess = () => {
      window.clearTimeout(expiryTimeout)
      useAppearanceStore.getState().syncProAccess()
      const user = useAuthStore.getState().user
      const expiresIn = user?.proExpiresAt ? new Date(user.proExpiresAt).getTime() - Date.now() : 0
      if (user?.isPro && expiresIn > 0) {
        expiryTimeout = window.setTimeout(syncAccess, Math.min(expiresIn + 1, 2_147_483_647))
      }
    }
    syncAccess()
    const unsubscribe = useAuthStore.subscribe(syncAccess)
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === APPEARANCE_STORAGE_KEY || event.key === null)) {
        useAppearanceStore.getState().restore(event.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', syncAccess)
    return () => {
      unsubscribe()
      window.clearTimeout(expiryTimeout)
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', syncAccess)
    }
  }, [])
  return <>
    {backgroundId !== 'default' && sceneryRoutes.test(pathname) &&
      <div className="product-scenery" aria-hidden="true"><WorkspaceBackground /></div>}
    {children}
  </>
}
