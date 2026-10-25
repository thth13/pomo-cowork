'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, Crown, Film, Flame, Leaf, Loader2, Palette, Pause, Play, RotateCcw, X } from 'lucide-react'
import { BACKGROUNDS, isAnimatedBackground, isPremiumBackground, isPremiumTimerFont, PLAY_BACKGROUND_EVENT, TIMER_FONTS } from '@/lib/appearance'
import { appearanceCopy } from '@/lib/i18n/appearance'
import { useI18n } from '@/components/I18nProvider'
import { useAppearanceStore } from '@/store/useAppearanceStore'
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference'
import { PaywallModal } from '@/components/PaywallModal'

function AppearanceChoice({ premium, locked, name, value, checked, busy, label, className = '', onSelect, onUnlock, children }: {
  premium: boolean
  locked: boolean
  name: string
  value: string
  checked: boolean
  busy?: boolean
  label: string
  className?: string
  onSelect: () => void
  onUnlock: () => void
  children: ReactNode
}) {
  const badge = premium && <span className="appearance-pro-badge" aria-hidden="true"><Crown size={11} />Pro</span>
  const classes = `appearance-choice ${className}`
  if (locked) return <button type="button" className={classes} data-premium aria-label={label} aria-haspopup="dialog" onClick={onUnlock}>{children}{badge}</button>
  return <label className={classes} data-premium={premium || undefined}>
    <input type="radio" name={name} value={value} checked={checked} aria-label={label} aria-busy={busy} onChange={onSelect} />
    {children}{badge}
  </label>
}

export default function AppearanceSettings() {
  const { language, t } = useI18n()
  const copy = appearanceCopy[language]
  const [open, setOpen] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
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
  const openPaywall = () => {
    // Leave the native top layer before opening the shared checkout/auth overlays.
    setOpen(false)
    setShowPaywall(true)
  }

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
                  <AppearanceChoice key={background.id} premium={isPremiumBackground(background.id)} locked={isPremiumBackground(background.id) && !state.hasProAccess}
                    name={radioName} value={background.id} checked={(state.pendingBackgroundId ?? state.backgroundId) === background.id} busy={loadingBackgroundId === background.id}
                    label={`${copy.names[background.id]}${isPremiumBackground(background.id) && !state.hasProAccess ? `. ${copy.unlockPremium}` : ''}`}
                    onSelect={() => state.setBackground(background.id)} onUnlock={openPaywall}>
                    <span className="appearance-scene-preview">
                      {background.kind === 'default' ? <span className="appearance-default-preview garden-page"><span aria-hidden="true">25:00</span></span> : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={background.preview} alt="" width={320} height={180} loading="lazy" />
                      )}
                      {background.kind === 'video' && <span className="appearance-video-badge"><Film size={12} aria-hidden="true" /><span className="sr-only">{copy.videos}</span></span>}
                      {'animation' in background && <span className="appearance-video-badge">{background.animation === 'autumn' ? <Leaf size={12} aria-hidden="true" /> : <Flame size={12} aria-hidden="true" />}<span className="sr-only">{copy.animated}</span></span>}
                      {background.kind !== 'default' && state.backgroundId === background.id && <span className="appearance-selected"><Check size={13} aria-hidden="true" /><span className="sr-only">{copy.selected}</span></span>}
                      {loadingBackgroundId === background.id && <span className="appearance-scene-loading"><Loader2 size={24} aria-hidden="true" /><span className="sr-only">{copy.loading}</span></span>}
                    </span>
                    <span className="appearance-choice-label">
                      {copy.names[background.id]}
                      {background.kind === 'default' && state.backgroundId === background.id && <span className="appearance-selected"><Check size={13} aria-hidden="true" /><span className="sr-only">{copy.selected}</span></span>}
                    </span>
                  </AppearanceChoice>
                ))}
              </div>
              <div className="appearance-media-feedback" role="status" aria-live="polite">
                {mediaStatus === 'loading' && <span className="sr-only">{copy.loading}</span>}
                {mediaStatus === 'error' && <><span>{state.failedBackgroundId && `${copy.names[state.failedBackgroundId]}: `}{copy.error}</span><button type="button" onClick={state.retryMedia}>{copy.retry}</button></>}
                {mediaStatus === 'blocked' && copy.blocked}
              </div>
              {isAnimatedBackground(selected) && (
                <div className="appearance-video-options">
                  <p>{reducedMotion ? copy.reducedMotion : selected.kind === 'video' ? copy.silent : copy.animatedSilent}</p>
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
                    {selected.kind === 'video' && <a href={selected.source} target="_blank" rel="noopener noreferrer">{copy.source} ↗</a>}
                  </div>
                </div>
              )}
            </fieldset>
            <fieldset className="appearance-section">
              <legend>{copy.font}</legend>
              <div className="appearance-fonts">
                {TIMER_FONTS.map(font => (
                  <AppearanceChoice key={font} className="appearance-font-choice" premium={isPremiumTimerFont(font)} locked={isPremiumTimerFont(font) && !state.hasProAccess}
                    name={fontName} value={font} checked={state.timerFont === font}
                    label={`${copy.fonts[font]}${isPremiumTimerFont(font) && !state.hasProAccess ? `. ${copy.unlockPremium}` : ''}`}
                    onSelect={() => state.setTimerFont(font)} onUnlock={openPaywall}>
                    <span className="appearance-font-sample" data-timer-font={font} aria-hidden="true">25:00</span>
                    <span className="appearance-choice-label">{copy.fonts[font]}{state.timerFont === font && <Check size={13} aria-hidden="true" />}</span>
                  </AppearanceChoice>
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
      {showPaywall && createPortal(<PaywallModal onClose={() => {
        setShowPaywall(false)
        triggerRef.current?.focus({ preventScroll: true })
      }} />, document.body)}
    </>
  )
}
