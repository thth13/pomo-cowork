'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PomodoroTimer from '@/components/PomodoroTimer'
import ActiveSessions from '@/components/ActiveSessions'
import { useAuthStore } from '@/store/useAuthStore'
import { useConnectionStore } from '@/store/useConnectionStore'
import { useI18n } from '@/components/I18nProvider'
import { registerServiceWorker } from '@/lib/serviceWorker'
import FocusStage from './FocusStage'
import StandaloneTimer from './StandaloneTimer'
import FlipClock from './FlipClock'
import FocusSounds from '@/components/FocusSounds'
import { useAmbientSounds } from '@/hooks/useAmbientSounds'
import type { SeoPage } from '@/lib/seoPages'

type Props = Pick<SeoPage, 'title' | 'defaults' | 'timerNote' | 'social' | 'socialHeading' | 'socialCopy' | 'appearance' | 'experience'>

export default function SeoWorkspace({ title, defaults, timerNote, social, socialHeading, socialCopy, appearance, experience }: Props) {
  const [mounted, setMounted] = useState(false)
  const isLoading = useAuthStore((state) => state.isLoading)
  const isConnected = useConnectionStore((state) => state.isConnected)
  const { language } = useI18n()
  const totalOnlineCount = useConnectionStore(state => state.totalOnlineCount)
  const standalone = experience === 'exam' || experience === 'reading' || experience === 'clock'
  const quiet = Boolean(experience)
  const sounds = experience === 'aesthetic' || experience === 'lofi'
  const content = standalone ? (
    experience === 'clock' ? <FlipClock /> : <StandaloneTimer reading={experience === 'reading'} />
  ) : !mounted || isLoading ? (
    <div className="seo-loading" role="status">
      <span className="seo-spinner" aria-hidden="true" />
      <span>{language === 'es' ? 'Preparando el temporizador…' : 'Getting your timer ready…'}</span>
    </div>
  ) : <PomodoroTimer idleTitle={title} initialSettings={defaults}
    presentation={experience === 'minimal' || experience === 'fullscreen' || experience === 'aesthetic' ? 'minimal' : undefined}
    focusPresets={experience === 'deep-work' || experience === 'coding'} showProject={experience === 'coding'}
    resetLabel={language === 'es' ? 'Reiniciar' : 'Reset'} />

  useEffect(() => {
    setMounted(true)
    registerServiceWorker()
  }, [])

  return (
    <div className={`seo-workspace${social ? ' seo-workspace-social' : ''}${appearance === 'aesthetic' ? ' seo-workspace-aesthetic' : ''}${quiet ? ' seo-workspace-intent' : ''}${experience ? ` seo-experience-${experience}` : ''}`}>
      <section className="seo-timer" id="focus-timer" aria-labelledby="timer-heading" tabIndex={-1}>
        <h2 id="timer-heading">{experience === 'clock' ? 'Your online flip clock' : experience === 'exam' ? 'Your practice countdown' : experience === 'reading' ? 'Your reading session' : 'Your next focus session'}</h2>
        <div className="seo-timer-live" lang={language}>
          {quiet ? <FocusStage>
            {content}
            {experience === 'minimal' && <p className="seo-online-count">
              {!mounted ? '—' : isConnected ? `${totalOnlineCount} ${language === 'es' ? 'en línea' : 'online'}` : (language === 'es' ? 'Reconectando…' : 'Reconnecting…')}
            </p>}
            {sounds && <SeoSounds />}
          </FocusStage> : content}
        </div>
        <p className="seo-timer-note">{timerNote}{!standalone && ' An existing session keeps its timing.'}</p>
        {!standalone && <Link className="seo-text-link" href="/settings">Sound and notification settings</Link>}
        {experience === 'coding' && <p className="seo-timer-note">Sign in to select a project. Completed project sessions appear in your <Link className="seo-text-link" href="/projects">project journal</Link>.</p>}
        <noscript><p>Enable JavaScript to run the interactive timer and see live sessions.</p></noscript>
      </section>
      {!quiet && <aside className="seo-social" aria-labelledby="social-heading">
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
      </aside>}
    </div>
  )
}

function SeoSounds() {
  const mixer = useAmbientSounds()
  const { language } = useI18n()
  return <details className="seo-sounds" open>
    <summary>{language === 'es' ? 'Sonidos ambientales' : 'Ambient sounds'}</summary>
    <FocusSounds mixer={mixer} />
  </details>
}
