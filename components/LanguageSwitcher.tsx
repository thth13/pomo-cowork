'use client'

import { ChevronDown } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import type { LanguageCode } from '@/lib/i18n/translations'

export default function LanguageSwitcher() {
  const { language, languages, setLanguage, t } = useI18n()

  return (
    <label className="relative inline-flex items-center text-xs text-gray-500 transition-colors hover:text-gray-800 focus-within:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200 dark:focus-within:text-slate-200">
      <span className="sr-only">{t.language.label}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as LanguageCode)}
        aria-label={t.language.label}
        className="cursor-pointer appearance-none bg-transparent py-1 pl-0 pr-5 font-medium outline-none"
      >
        {languages.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-0 h-3.5 w-3.5"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </label>
  )
}
