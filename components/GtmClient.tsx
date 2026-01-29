'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initGtm, reportHomeConversion, reportPageLoadConversion } from '@/lib/gtm'

export default function GtmClient() {
  const pathname = usePathname()

  useEffect(() => {
    initGtm()
  }, [])

  useEffect(() => {
    reportPageLoadConversion(pathname)
    if (pathname === '/') {
      reportHomeConversion()
    }
  }, [pathname])

  return null
}
