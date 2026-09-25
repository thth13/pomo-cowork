'use client'

import { useEffect, useState } from 'react'
import { Apple, Heart, Droplets, Sprout } from 'lucide-react'
import PixelSprout from './PixelSprout'
import { useI18n } from './I18nProvider'
import { gardenCopy } from '@/lib/i18n/garden'
import { canSavePet, PET_CARE_COOLDOWN, usePetStore } from '@/store/usePetStore'
import { useTimerStore } from '@/store/useTimerStore'
import { SessionType } from '@/types'

export default function PocketGarden() {
  const { language } = useI18n()
  const copy = gardenCopy[language]
  const pet = usePetStore()
  const working = useTimerStore((s) => s.isRunning && (s.currentSession?.type === SessionType.WORK || s.currentSession?.type === SessionType.TIME_TRACKING))
  const [ready, setReady] = useState(false)
  const [feedback, setFeedback] = useState<'fed' | 'petted' | 'watered' | null>(null)
  const [now, setNow] = useState(0)
  useEffect(() => {
    const refresh = () => { pet.refresh(); setNow(Date.now()); setReady(true) }
    refresh()
    const interval = window.setInterval(refresh, 30_000)
    const sync = (event: StorageEvent) => {
      if (event.key === 'pomo:sprout:v1') {
        void usePetStore.persist.rehydrate()
        setNow(Date.now())
      }
    }
    window.addEventListener('storage', sync)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(interval); window.removeEventListener('focus', refresh); window.removeEventListener('storage', sync) }
  }, [pet.refresh])
  useEffect(() => {
    if (!feedback) return
    const timeout = window.setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timeout)
  }, [feedback])
  const level = 1 + Math.floor(pet.focusMinutes / 100)
  const care = (action: 'feed' | 'pet' | 'water') => {
    if (pet.care(action)) {
      setNow(Date.now())
      setFeedback(action === 'feed' ? 'fed' : action === 'pet' ? 'petted' : 'watered')
    }
  }
  return (
    <section className="pocket-garden pixel-panel" aria-labelledby="garden-title" data-no-translate>
      <div className="pixel-panel-heading"><span id="garden-title"><Sprout size={16} />{copy.garden}</span><span>♥</span></div>
      <div className="garden-name"><div><h2>{copy.name}</h2><span>{level >= 5 ? copy.bloom : level >= 3 ? copy.sapling : copy.seedling}</span></div><span className="pixel-tag">{copy.level} {ready ? level : '1'}</span></div>
      <div className={`garden-scene ${working ? 'is-working' : ''}`}>
        <div className="pixel-cloud cloud-one" /><div className="pixel-cloud cloud-two" />
        <span className="garden-sun" aria-hidden="true" />
        <p className="garden-speech">{feedback ? copy[feedback] : working ? copy.working : pet.fullness < 30 ? copy.hungry : copy.idle}</p>
        <PixelSprout className={`garden-sprout ${feedback ? 'is-happy' : ''}`} happy={!!feedback || working} />
        <span className="garden-flower flower-one" aria-hidden="true">✦</span><span className="garden-flower flower-two" aria-hidden="true">✦</span>
        {level >= 3 && <span className="garden-flower flower-three" aria-hidden="true">✿</span>}
        <div className="garden-ground" />
      </div>
      <div className="garden-body">
        <div className="garden-experience"><span>{ready ? pet.focusMinutes : 0} {copy.minutes}</span><span>{100 - pet.focusMinutes % 100} {copy.next}</span></div>
        <div className="pixel-meter xp-meter" role="progressbar" aria-label={copy.next} aria-valuenow={pet.focusMinutes % 100} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pet.focusMinutes % 100}%` }} /></div>
        <div className="garden-needs">
          {([{ label: copy.full, value: pet.fullness, Icon: Apple }, { label: copy.joy, value: pet.joy, Icon: Heart }, { label: copy.water, value: pet.water, Icon: Droplets }]).map(({ label, value, Icon }) => (
            <div className="garden-need" key={label}><span><Icon size={14} />{label}</span><div className="pixel-meter" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${value}%` }} /></div><small>{Math.round(value)}%</small></div>
          ))}
        </div>
        <div className="garden-actions">
          <button className="pixel-action primary" onClick={() => care('feed')} disabled={!ready || pet.food < 1 || Math.round(pet.fullness) >= 100} aria-describedby="garden-care-hint"><Apple size={17} />{copy.feed}<span>{ready ? pet.food : 0}</span></button>
          <button className="pixel-action" onClick={() => care('pet')} disabled={!ready || now - pet.lastPetAt < PET_CARE_COOLDOWN || Math.round(pet.joy) >= 100} aria-describedby="garden-cooldown"><Heart size={17} />{copy.pet}</button>
          <button className="pixel-action" onClick={() => care('water')} disabled={!ready || now - pet.lastWaterAt < PET_CARE_COOLDOWN || Math.round(pet.water) >= 100} aria-describedby="garden-cooldown"><Droplets size={17} />{copy.waterAction}</button>
        </div>
        <p id="garden-care-hint" className="garden-hint">{copy.hint}</p>
        <p id="garden-cooldown" className="garden-hint">{copy.cooldown}</p>
        <p className="sr-only" role="status">{feedback ? copy[feedback] : ''}</p>
      </div>
      <div className="garden-save"><span aria-hidden="true">▣</span> {canSavePet() ? copy.saved : copy.temporary}</div>
    </section>
  )
}
