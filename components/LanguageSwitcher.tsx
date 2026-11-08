'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { findSeoLanguagePaths } from '@/lib/seoRoutes'
import { ChevronDown } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import type { LanguageCode } from '@/lib/i18n/translations'

export default function LanguageSwitcher({ variant = 'default' }: { variant?: 'default' | 'settings' }) {
  const { language, languages, setLanguage, t } = useI18n()

  const pathname = usePathname()

  if (pathname === '/' || pathname === '/es' || findSeoLanguagePaths(pathname)) {
    return (
      <nav aria-label={t.language.label} className="flex items-center gap-3 text-xs" data-i18n-ignore>
        {languages.map((item) => (
          <Link key={item.code} href={findSeoLanguagePaths(pathname)?.[item.code] ?? (item.code === 'es' ? '/es' : '/')} hrefLang={item.code} lang={item.code}
            aria-current={language === item.code ? 'page' : undefined}
            className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 aria-[current=page]:underline">
            {item.label}
          </Link>
        ))}
      </nav>
    )
  }

  return (
    <label className={variant === 'settings' ? 'settings-language-switcher' : 'relative inline-flex items-center text-xs text-gray-500 transition-colors hover:text-gray-800 focus-within:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200 dark:focus-within:text-slate-200'}>
      <span className={variant === 'settings' ? undefined : 'sr-only'}>{t.language.label}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as LanguageCode)}
        aria-label={t.language.label}
        className={variant === 'settings' ? 'settings-language-select' : 'cursor-pointer appearance-none bg-transparent py-1 pl-0 pr-5 font-medium outline-none'}
      >
        {languages.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>
      {variant !== 'settings' && <ChevronDown
        className="pointer-events-none absolute right-0 h-3.5 w-3.5"
        strokeWidth={1.75}
        aria-hidden="true"
      />}
    </label>
  )
}
