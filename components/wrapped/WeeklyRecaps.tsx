'use client'

import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { useAuthStore } from '@/store/useAuthStore'
import { wrappedCopy } from '@/lib/i18n/wrapped'
import { previousMonday, weekLabel } from '@/lib/wrapped/analytics'
import { shiftDate } from '@/lib/statistics'
import { useWrapped } from './WrappedProvider'

export default function WeeklyRecaps() {
  const { language } = useI18n()
  const user = useAuthStore(state => state.user)
  const context = useWrapped()
  const [date, setDate] = useState('')
  const copy = wrappedCopy[language]
  if (!user || !context) return null
  const max = previousMonday(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  const { history, loading, error, openWeek } = context
  return <section className="weekly-recaps" data-no-translate lang={language} aria-busy={loading}>
    <details><summary>{copy.recaps}<ArrowUpRight size={16} aria-hidden="true" /></summary>
      <div className="weekly-recaps-body">
        {history.length > 0 ? <ul aria-label={copy.saved}>{history.map(item => <li key={item.weekStart}><button type="button" disabled={loading} onClick={() => { void openWeek(item.weekStart) }}>{weekLabel(item, language)}<span>{item.weekStart.slice(0, 4)}</span><ArrowUpRight size={14} /></button></li>)}</ul> : <p>{copy.empty}</p>}
        <form onSubmit={event => {
          event.preventDefault()
          if (!date) return
          const offset = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7
          void openWeek(shiftDate(date, -offset))
        }}><label>{copy.older}<input type="date" value={date} min="2020-01-06" max={shiftDate(max, 6)} required onChange={event => setDate(event.target.value)} /></label><button type="submit" disabled={loading || !date}>{copy.open}</button></form>
        <div role="status">{loading ? copy.loading : error ? <>{copy.error} <button type="button" onClick={() => { context.refresh() }}>{copy.retry}</button></> : ''}</div>
      </div>
    </details>
  </section>
}
