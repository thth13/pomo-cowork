'use client'

import { useEffect, type ReactNode } from 'react'
import { APPEARANCE_STORAGE_KEY, useAppearanceStore } from '@/store/useAppearanceStore'

export function AppearanceProvider({ children }: { children: ReactNode }) {
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
  return <>{children}</>
}
