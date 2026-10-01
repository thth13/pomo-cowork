'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/components/I18nProvider'

export default function FlipClock() {
  const [now, setNow] = useState<Date | null>(null)
  const [twelveHour, setTwelveHour] = useState(false)
  const [showSeconds, setShowSeconds] = useState(true)
  const { language } = useI18n()
  const es = language === 'es'
  useEffect(() => {
    setNow(new Date())
    const interval = window.setInterval(() => setNow(new Date()), 250)
    return () => window.clearInterval(interval)
  }, [])
  const hours = now ? (twelveHour ? now.getHours() % 12 || 12 : now.getHours()) : null
  const pairs = [hours, now?.getMinutes(), ...(showSeconds ? [now?.getSeconds()] : [])].map(value => value == null ? '--' : String(value).padStart(2, '0'))
  return <div className="seo-clock">
    <p>{es ? 'Hora local de tu dispositivo' : 'Your device’s local time'}</p>
    <div className="seo-flip-display" role="timer" aria-label={pairs.join(':')}>
      {pairs.map((pair, index) => <span className="seo-flip-pair" key={index} aria-hidden="true">
        {index > 0 && <span className="seo-flip-colon">:</span>}
        {pair.split('').map((digit, place) => <span className="seo-flip-card" key={place}><span key={digit} className="seo-flip-number">{digit}</span></span>)}
      </span>)}
    </div>
    <p className="seo-clock-date">{now ? now.toLocaleDateString(es ? 'es' : 'en', { weekday: 'long', month: 'long', day: 'numeric' }) : '\u00a0'}{now && twelveHour ? ` · ${now.getHours() >= 12 ? 'PM' : 'AM'}` : ''}</p>
    <div className="seo-tool-options">
      <button type="button" aria-pressed={twelveHour} onClick={() => setTwelveHour(value => !value)}>{es ? 'Formato de 12 horas' : '12-hour clock'}</button>
      <button type="button" aria-pressed={showSeconds} onClick={() => setShowSeconds(value => !value)}>{es ? 'Mostrar segundos' : 'Show seconds'}</button>
    </div>
    <Link className="seo-text-link" href="/aesthetic-pomodoro-timer">{es ? 'Iniciar un Pomodoro →' : 'Start a Pomodoro →'}</Link>
  </div>
}
