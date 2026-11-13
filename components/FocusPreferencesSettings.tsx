'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { PanelsTopLeft } from 'lucide-react'
import { useI18n } from './I18nProvider'
import { gardenCopy } from '@/lib/i18n/garden'
import { useFocusPreferencesStore } from '@/store/useFocusPreferencesStore'

export default function FocusPreferencesSettings() {
  const { language } = useI18n()
  const copy = gardenCopy[language]
  const preferences = useFocusPreferencesStore()
  useEffect(() => { useFocusPreferencesStore.getState().hydrate() }, [])

  const options = [
    { key: 'minimalTimer', title: copy.minimalTimer, description: copy.minimalTimerDescription },
    { key: 'offline', title: copy.offlineFocus, description: copy.offlineFocusDescription },
    { key: 'hideRoomSwitch', title: copy.hideRoomSwitch, description: copy.hideRoomSwitchDescription },
  ] as const

  return <section className="settings-panel settings-focus" aria-labelledby="settings-focus-title" data-no-translate="true">
    <div className="settings-focus-heading">
      <span className="settings-section-icon"><PanelsTopLeft size={24} aria-hidden="true" /></span>
      <div>
        <h2 id="settings-focus-title">{copy.focusWorkspace}</h2>
        <p>{copy.focusWorkspaceDescription}</p>
      </div>
    </div>
    <div className="settings-focus-options">
      {options.map(option => <div className="settings-focus-option" data-option={option.key} key={option.key}>
        <div className="settings-focus-control">
          <div>
            <label htmlFor={`focus-preference-${option.key}`}>{option.title}</label>
            <p id={`focus-preference-${option.key}-help`}>
              {option.description}
              {option.key === 'hideRoomSwitch' && <> <Link href="/rooms" className="settings-focus-link">{copy.roomSelectionPage}</Link>.</>}
            </p>
          </div>
          <div className="settings-toggle">
            <input id={`focus-preference-${option.key}`} type="checkbox" role="switch"
              className="settings-checkbox settings-focus-switch"
              checked={preferences[option.key]} disabled={!preferences.hydrated || preferences.syncStatus === 'saving' || preferences.syncStatus === 'loading'}
              aria-describedby={`focus-preference-${option.key}-help`}
              onChange={event => { void preferences.update({ [option.key]: event.currentTarget.checked }) }} />
          </div>
        </div>
        {option.key === 'minimalTimer' && <figure className="settings-focus-preview">
          <div className="settings-focus-image">
            <Image src={`/settings/minimal-timer-${language}.png`} alt={copy.minimalTimerPreview} fill
              sizes="(max-width: 900px) 90vw, 460px" unoptimized />
          </div>
          <figcaption>{copy.minimalTimerCaption}</figcaption>
        </figure>}
      </div>)}
    </div>
    <div className="settings-focus-storage" role="status">
      {preferences.accountBacked
        ? preferences.syncStatus === 'saving' ? copy.preferencesSaving
          : preferences.syncStatus === 'loading' ? copy.preferencesLoading
            : preferences.syncStatus === 'error' ? copy.preferencesSyncError : copy.preferencesSavedAccount
        : preferences.storageAvailable ? copy.preferencesSavedLocally : copy.preferencesStorageUnavailable}
      {preferences.accountBacked && preferences.syncStatus === 'error' && <button type="button"
        className="settings-button" onClick={() => { void preferences.retry() }}>{copy.preferencesRetry}</button>}
    </div>
  </section>
}
