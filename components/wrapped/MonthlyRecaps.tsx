'use client'

import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { useAuthStore } from '@/store/useAuthStore'
import { wrappedCopy } from '@/lib/i18n/wrapped'
import { previousMonthStart, monthLabel } from '@/lib/wrapped/analytics'
import { useWrapped } from './WrappedProvider'

export default function MonthlyRecaps() {
  const { language } = useI18n()
  const user = useAuthStore(state => state.user)
  const context = useWrapped()
  const [date, setDate] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [requested, setRequested] = useState<string>()
  const copy = wrappedCopy[language]
  if (!user || !context) return null
  const max = previousMonthStart(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  const { history, loading, error, openMonth } = context
  return <section className="monthly-recaps" data-no-translate lang={language} aria-busy={loading}>
    <details><summary>{copy.recaps}<ArrowUpRight size={16} aria-hidden="true" /></summary>
      <div className="monthly-recaps-body">
        {history.length > 0 ? <ul aria-label={copy.saved}>{history.map(item => <li key={item.monthStart}><button type="button" disabled={loading} onClick={() => { setRequested(item.monthStart); void openMonth(item.monthStart) }}>{monthLabel(item, language)}<ArrowUpRight size={14} /></button></li>)}</ul> : <p>{copy.empty}</p>}
        <form noValidate onSubmit={event => {
          event.preventDefault()
          if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(date) || `${date}-01` > max || date < '2020-01') { setInvalid(true); return }
          setInvalid(false)
          setRequested(`${date}-01`)
          void openMonth(`${date}-01`)
        }}><label>{copy.older}<input type="month" value={date} min="2020-01" max={max.slice(0, 7)} required aria-invalid={invalid} onChange={event => { setDate(event.target.value); setInvalid(false) }} /></label><button type="submit" disabled={loading || !date}>{copy.open}</button></form>
        {invalid && <p role="alert">{copy.invalidMonth}</p>}
        <div role="status">{loading ? copy.loading : error ? <>{copy.error} <button type="button" onClick={() => { void openMonth(requested) }}>{copy.retry}</button></> : ''}</div>
      </div>
    </details>
  </section>
}
