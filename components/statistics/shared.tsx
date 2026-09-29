'use client'

import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { statisticsCopy } from '@/lib/i18n/statistics'

export function useStatisticsCopy() {
  const { language } = useI18n()
  const locale = language === 'es' ? 'es-ES' : 'en-US'
  const number = (value: number) => value.toLocaleString(locale)
  const duration = (minutes: number) => {
    const rounded = Math.max(0, Math.round(minutes))
    const hours = Math.floor(rounded / 60)
    const remainder = rounded % 60
    return hours ? `${number(hours)} h${remainder ? ` ${remainder} min` : ''}` : `${remainder} min`
  }
  const date = (key: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) => new Date(`${key}T12:00:00Z`).toLocaleDateString(locale, { ...options, timeZone: 'UTC' })
  return { copy: statisticsCopy[language], locale, language, number, duration, date }
}

export function SectionHeading({ title, caption, aside }: { title: string; caption?: string; aside?: ReactNode }) {
  return <header className="insight-section-heading"><div><h2>{title}</h2>{caption && <p>{caption}</p>}</div>{aside}</header>
}

export function Change({ current, previous, label = false }: { current: number; previous: number; label?: boolean }) {
  const { copy } = useStatisticsCopy()
  const delta = current - previous
  const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus
  const text = previous > 0 ? `${delta > 0 ? '+' : ''}${Math.round(delta / previous * 100)}%` : delta > 0 ? copy.newWeek : '—'
  return <span className={`insight-change ${delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : ''}`}><Icon size={15} aria-hidden="true" />{text}{label && previous > 0 && <span>{copy.versus}</span>}</span>
}

export function timeLabel(hour: number) { return `${String(hour).padStart(2, '0')}:00` }
