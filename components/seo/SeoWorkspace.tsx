'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PomodoroTimer from '@/components/PomodoroTimer'
import ActiveSessions from '@/components/ActiveSessions'
import { useAuthStore } from '@/store/useAuthStore'
import { useConnectionStore } from '@/store/useConnectionStore'
import { useI18n } from '@/components/I18nProvider'
import { registerServiceWorker } from '@/lib/serviceWorker'
import type { SeoPage } from '@/lib/seoPages'

type Props = Pick<SeoPage, 'title' | 'defaults' | 'timerNote' | 'social' | 'socialHeading' | 'socialCopy' | 'appearance'>

export default function SeoWorkspace({ title, defaults, timerNote, social, socialHeading, socialCopy, appearance }: Props) {
  const [mounted, setMounted] = useState(false)
  const isLoading = useAuthStore((state) => state.isLoading)
  const isConnected = useConnectionStore((state) => state.isConnected)
  const { language } = useI18n()

  useEffect(() => {
    setMounted(true)
    registerServiceWorker()
  }, [])

  return (
    <div className={`seo-workspace${social ? ' seo-workspace-social' : ''}${appearance === 'aesthetic' ? ' seo-workspace-aesthetic' : ''}`}>
      <section className="seo-timer" id="focus-timer" aria-labelledby="timer-heading" tabIndex={-1}>
        <h2 id="timer-heading">Your next focus session</h2>
        <div className="seo-timer-live" lang={language}>
          {!mounted || isLoading ? (
            <div className="seo-loading" role="status">
              <span className="seo-spinner" aria-hidden="true" />
              <span>{language === 'es' ? 'Preparando el temporizador…' : 'Getting your timer ready…'}</span>
            </div>
          ) : (
            <PomodoroTimer idleTitle={title} initialSettings={defaults} resetLabel={language === 'es' ? 'Reiniciar' : 'Reset'} />
          )}
        </div>
        <p className="seo-timer-note">{timerNote} An existing session keeps its timing.</p>
        <Link className="seo-text-link" href="/settings">Sound and notification settings</Link>
        <noscript><p>Enable JavaScript to run the interactive timer and see live sessions.</p></noscript>
      </section>
      <aside className="seo-social" aria-labelledby="social-heading">
        <p className="seo-eyebrow">A little company</p>
        <h2 id="social-heading">{socialHeading}</h2>
        <p>{socialCopy}</p>
        <div className="seo-presence" lang={language}>
          {!mounted || isLoading ? (
            <p className="seo-presence-status" role="status">{language === 'es' ? 'Cargando sesiones en vivo…' : 'Loading live sessions…'}</p>
          ) : !isConnected ? (
            <p className="seo-presence-status" role="status">{language === 'es' ? 'Las sesiones en vivo no están disponibles. Reconectando…' : 'Live sessions are unavailable. Reconnecting…'}</p>
          ) : <ActiveSessions variant="page" />}
        </div>
        <div className="seo-social-links">
          <Link className="seo-text-link" href="/rooms">Explore study rooms <span aria-hidden="true">↗</span></Link>
          <Link className="seo-text-link" href="/">Open the shared workspace <span aria-hidden="true">↗</span></Link>
        </div>
      </aside>
    </div>
  )
}
