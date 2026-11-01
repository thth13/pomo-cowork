'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { canUseGoogleTracking } from '@/lib/analyticsEnvironment'
import { usePathname } from 'next/navigation'
import { initGtm, reportHomeConversion, reportPageLoadConversion } from '@/lib/gtm'

export default function GtmClient() {
  const pathname = usePathname()
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (!canUseGoogleTracking()) return
    setEnabled(true)
    initGtm()
  }, [])

  useEffect(() => {
    reportPageLoadConversion(pathname)
    if (pathname === '/') {
      reportHomeConversion()
    }
  }, [pathname])

  if (!enabled) return null

  return (
    <>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-TEKE22N2N5" />
      <Script src="https://www.googletagmanager.com/gtag/js?id=AW-11075064387" />
      <Script id="gtag-init" dangerouslySetInnerHTML={{
        __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-TEKE22N2N5');
          gtag('config', 'AW-11075064387');
        `,
      }} />
    </>
  )
}
