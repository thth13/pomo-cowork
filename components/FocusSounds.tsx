'use client'

import { Play, Volume2 } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { ambientSounds } from '@/lib/ambientSounds'
import { ambientSoundsCopy } from '@/lib/i18n/ambientSounds'
import type { AmbientMixer } from '@/hooks/useAmbientSounds'

export default function FocusSounds({ mixer }: { mixer: AmbientMixer }) {
  const { language } = useI18n()
  const copy = ambientSoundsCopy[language]
  return (
    <div className="focus-sounds" data-no-translate>
      {mixer.hasSavedMix && (
        <div className="focus-sounds-resume">
          <button type="button" onClick={mixer.resume}><Play size={14} aria-hidden="true" />{copy.resume}</button>
        </div>
      )}
      <div className="focus-sounds-grid">
        {ambientSounds.map(({ id, icon: Icon }) => {
          const { enabled } = mixer.preferences.tracks[id]
          const status = mixer.statuses[id] ?? 'idle'
          const name = copy.names[id]
          return (
            <button key={id} type="button" className="focus-sounds-toggle" aria-pressed={enabled}
              aria-label={name} title={name} disabled={!mixer.ready}
              aria-describedby={enabled && (status === 'unavailable' || status === 'blocked') ? `ambient-${id}-error` : undefined}
              onClick={() => mixer.toggle(id)}>
              <span className="focus-sounds-key"><Icon size={24} strokeWidth={1.5} aria-hidden="true" /></span>
              <span className="focus-sounds-name">{name}</span>
              {status === 'loading' && <span className="sr-only" role="status">{copy.loading}</span>}
            </button>
          )
        })}
      </div>
      {ambientSounds.map(({ id }) => {
        const status = mixer.statuses[id]
        if (!mixer.preferences.tracks[id].enabled || (status !== 'unavailable' && status !== 'blocked')) return null
        return (
          <div key={id} id={`ambient-${id}-error`} className="focus-sounds-error" role="status">
            <span>{copy.names[id]}: {copy[status]}</span>
            <button type="button" aria-label={`${copy.retry}: ${copy.names[id]}`} onClick={() => mixer.retry(id)}>{copy.retry}</button>
          </div>
        )
      })}
      <footer className="focus-sounds-footer">
        <label htmlFor="ambient-master" title={copy.master}>
          <Volume2 size={15} aria-hidden="true" /><span className="sr-only">{copy.master}</span>
        </label>
        <input id="ambient-master" type="range" min="0" max="100" step="1" value={mixer.preferences.master}
          disabled={!mixer.ready} aria-valuetext={`${mixer.preferences.master}%`}
          onChange={event => mixer.setMaster(Number(event.target.value))} />
        <output aria-hidden="true">{mixer.preferences.master}%</output>
      </footer>
    </div>
  )
}
