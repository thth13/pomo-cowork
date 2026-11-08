'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  defaultLanguage,
  languages,
  translations,
  type LanguageCode,
} from '@/lib/i18n/translations'
import { usePathname, useRouter } from 'next/navigation'
import DomTranslationBridge from '@/components/DomTranslationBridge'

type DeepString<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>
}

type TranslationDictionary = DeepString<typeof translations.en>

interface I18nContextValue {
  language: LanguageCode
  languages: typeof languages
  setLanguage: (language: LanguageCode) => void
  t: TranslationDictionary
}

const I18nContext = createContext<I18nContextValue | null>(null)

const storageKey = 'pomo:language'

function isLanguageCode(value: string | null): value is LanguageCode {
  return languages.some((language) => language.code === value)
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const routeLanguage = pathname === '/es' || pathname.startsWith('/es/') ? 'es' : pathname === '/' ? 'en' : null
  const [preferredLanguage, setLanguageState] = useState<LanguageCode>(defaultLanguage)
  const language: LanguageCode = routeLanguage ?? preferredLanguage

  useEffect(() => {
    if (routeLanguage) {
      setLanguageState(routeLanguage)
      try { localStorage.setItem(storageKey, routeLanguage) } catch { /* Use the URL when storage is unavailable. */ }
      return
    }
    let storedLanguage: string | null = null
    try { storedLanguage = localStorage.getItem(storageKey) } catch { /* Fall back to the browser language. */ }
    const browserLanguage = navigator.language.split('-')[0]
    setLanguageState(isLanguageCode(storedLanguage) ? storedLanguage : isLanguageCode(browserLanguage) ? browserLanguage : defaultLanguage)
  }, [routeLanguage])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language, pathname])

  const setLanguage = (nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage)
    try { localStorage.setItem(storageKey, nextLanguage) } catch { /* Keep the selection in memory. */ }
    if (routeLanguage && nextLanguage !== routeLanguage) {
      router.push(`${nextLanguage === 'es' ? '/es' : '/'}${window.location.search}${window.location.hash}`, { scroll: false })
    }
  }

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      languages,
      setLanguage,
      t: translations[language],
    }),
    [language]
  )

  return (
    <I18nContext.Provider value={value}>
      <DomTranslationBridge language={language} />
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) {
    throw new Error('useI18n must be used within I18nProvider')
  }

  return value
}
