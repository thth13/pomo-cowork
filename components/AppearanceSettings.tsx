'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, Film, Loader2, Palette, Pause, Play, RotateCcw, X } from 'lucide-react'
import { BACKGROUNDS, PLAY_BACKGROUND_EVENT, TIMER_FONTS } from '@/lib/appearance'
import { appearanceCopy } from '@/lib/i18n/appearance'
import { useI18n } from '@/components/I18nProvider'
import { useAppearanceStore } from '@/store/useAppearanceStore'
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference'

export default function AppearanceSettings() {
  const { language, t } = useI18n()
  const copy = appearanceCopy[language]
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const backdropPointer = useRef(false)
  const titleId = useId()
  const descriptionId = useId()
  const radioName = useId()
  const fontName = useId()
  const state = useAppearanceStore()
  const reducedMotion = useReducedMotionPreference()
  const selected = BACKGROUNDS.find(background => background.id === state.backgroundId) ?? BACKGROUNDS[0]
  const mediaStatus = state.pendingBackgroundId ? 'loading' : state.failedBackgroundId ? 'error' : state.mediaStatus
  const loadingBackgroundId = state.pendingBackgroundId ?? (state.mediaStatus === 'loading' ? state.backgroundId : null)

  useEffect(() => {
    const dialog = dialogRef.current
    const trigger = triggerRef.current
    if (!open || !dialog) return
    dialog.showModal()
    return () => {
      dialog.close()
      trigger?.focus({ preventScroll: true })
    }
  }, [open])

  return (
    <>
      <button ref={triggerRef} type="button" className="timer-appearance-trigger" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={copy.trigger} title={copy.trigger} data-no-translate>
        <Palette size={18} aria-hidden="true" />
      </button>
      {open && (
        <dialog
          ref={dialogRef}
          className="appearance-dialog"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          lang={language}
          data-no-translate
          onCancel={event => { event.preventDefault(); setOpen(false) }}
          onPointerDown={event => {
            const bounds = event.currentTarget.getBoundingClientRect()
            backdropPointer.current = event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)
          }}
          onClick={event => {
            if (backdropPointer.current && event.target === event.currentTarget) setOpen(false)
            backdropPointer.current = false
          }}
        >
          <header className="appearance-header">
            <div><h2 id={titleId}>{copy.title}</h2><p id={descriptionId}>{copy.description}</p></div>
            <button type="button" className="appearance-icon-button" onClick={() => setOpen(false)} aria-label={t.common.close} autoFocus><X size={20} aria-hidden="true" /></button>
          </header>
          <div className="appearance-body">
            <fieldset className="appearance-section">
              <legend>{copy.backgrounds}</legend>
              <div className="appearance-scenes">
                {BACKGROUNDS.map(background => (
                  <label key={background.id} className="appearance-choice">
                    <input type="radio" name={radioName} value={background.id} checked={(state.pendingBackgroundId ?? state.backgroundId) === background.id} aria-busy={loadingBackgroundId === background.id} onChange={() => state.setBackground(background.id)} />
                    <span className="appearance-scene-preview">
                      {background.kind === 'default' ? <span className="appearance-default-preview garden-page"><span aria-hidden="true">25:00</span></span> : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={background.preview} alt="" width={320} height={180} loading="lazy" />
                      )}
                      {background.kind === 'video' && <span className="appearance-video-badge"><Film size={12} aria-hidden="true" /><span className="sr-only">{copy.videos}</span></span>}
                      {background.kind !== 'default' && state.backgroundId === background.id && <span className="appearance-selected"><Check size={13} aria-hidden="true" /><span className="sr-only">{copy.selected}</span></span>}
                      {loadingBackgroundId === background.id && <span className="appearance-scene-loading"><Loader2 size={24} aria-hidden="true" /><span className="sr-only">{copy.loading}</span></span>}
                    </span>
                    <span className="appearance-choice-label">
                      {copy.names[background.id]}
                      {background.kind === 'default' && state.backgroundId === background.id && <span className="appearance-selected"><Check size={13} aria-hidden="true" /><span className="sr-only">{copy.selected}</span></span>}
                    </span>
                  </label>
                ))}
              </div>
              <div className="appearance-media-feedback" role="status" aria-live="polite">
                {mediaStatus === 'loading' && <span className="sr-only">{copy.loading}</span>}
                {mediaStatus === 'error' && <><span>{state.failedBackgroundId && `${copy.names[state.failedBackgroundId]}: `}{copy.error}</span><button type="button" onClick={state.retryMedia}>{copy.retry}</button></>}
                {mediaStatus === 'blocked' && copy.blocked}
              </div>
              {selected.kind === 'video' && (
                <div className="appearance-video-options">
                  <p>{reducedMotion ? copy.reducedMotion : copy.silent}</p>
                  <div>
                    {!reducedMotion && state.mediaStatus !== 'error' && (
                      <button type="button" className="appearance-secondary" onClick={() => {
                        if (state.videoPaused || state.mediaStatus === 'blocked') {
                          window.dispatchEvent(new Event(PLAY_BACKGROUND_EVENT))
                        } else state.setVideoPaused(true)
                      }}>
                        {state.videoPaused || state.mediaStatus === 'blocked' ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
                        {state.videoPaused || state.mediaStatus === 'blocked' ? copy.play : copy.pause}
                      </button>
                    )}
                    <a href={selected.source} target="_blank" rel="noopener noreferrer">{copy.source} ↗</a>
                  </div>
                </div>
              )}
            </fieldset>
            <fieldset className="appearance-section">
              <legend>{copy.font}</legend>
              <div className="appearance-fonts">
                {TIMER_FONTS.map(font => (
                  <label key={font} className="appearance-choice appearance-font-choice">
                    <input type="radio" name={fontName} checked={state.timerFont === font} value={font} onChange={() => state.setTimerFont(font)} />
                    <span className="appearance-font-sample" data-timer-font={font} aria-hidden="true">25:00</span>
                    <span className="appearance-choice-label">{copy.fonts[font]}{state.timerFont === font && <Check size={13} aria-hidden="true" />}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <footer className="appearance-footer">
            <p role="status">{state.storageAvailable ? copy.saved : copy.temporary}</p>
            <div>
              <button type="button" className="appearance-secondary" onClick={state.reset}><RotateCcw size={14} aria-hidden="true" />{copy.reset}</button>
              <button type="button" className="appearance-done" onClick={() => setOpen(false)}>{copy.done}</button>
            </div>
          </footer>
        </dialog>
      )}
    </>
  )
}
