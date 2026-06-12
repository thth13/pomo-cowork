'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  defaultLanguage,
  languages,
  translations,
  type LanguageCode,
} from '@/lib/i18n/translations'
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
  const [language, setLanguageState] = useState<LanguageCode>(defaultLanguage)

  useEffect(() => {
    const storedLanguage = localStorage.getItem(storageKey)
    if (isLanguageCode(storedLanguage)) {
      setLanguageState(storedLanguage)
      document.documentElement.lang = storedLanguage
      return
    }

    const browserLanguage = navigator.language.split('-')[0]
    if (isLanguageCode(browserLanguage)) {
      setLanguageState(browserLanguage)
      document.documentElement.lang = browserLanguage
    }
  }, [])

  const setLanguage = (nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage)
    localStorage.setItem(storageKey, nextLanguage)
    document.documentElement.lang = nextLanguage
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
