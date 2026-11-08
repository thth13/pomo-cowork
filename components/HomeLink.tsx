'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import { useI18n } from '@/components/I18nProvider'
import { homeHref } from '@/lib/homeNavigation'

/** Return to the workspace in the current language. Language selectors use explicit URLs. */
export default function HomeLink(props: Omit<ComponentProps<typeof Link>, 'href'>) {
  const { language } = useI18n()
  return <Link {...props} href={homeHref(language)} />
}
