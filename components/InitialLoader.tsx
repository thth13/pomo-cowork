'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { isSeoPath } from '@/lib/seoRoutes'
import SiteLoader from '@/components/SiteLoader'

export default function InitialLoader() {
  const pathname = usePathname()
  const { isLoading } = useAuthStore()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  if (pathname === '/' || pathname.startsWith('/@') || pathname === '/blog' || pathname.startsWith('/blog/') || isSeoPath(pathname) || !isHydrated || !isLoading) {
    return null
  }

  return (
    <SiteLoader fullscreen />
  )
}
