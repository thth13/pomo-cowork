'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'

export default function InitialLoader() {
  const { isLoading } = useAuthStore()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  if (!isHydrated || !isLoading) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-full border-2 border-slate-200 dark:border-slate-800 border-t-rose-500 animate-spin" />
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
          Loading
        </span>
      </div>
    </div>
  )
}
