'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, Download, Copy, Share2, Sprout, Trophy, Clock3, Target, Flame } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import CommunityDialog from '@/components/CommunityDialog'
import { useI18n } from '@/components/I18nProvider'
import { focusDuration, monthLabel, type MonthlyWrapped } from '@/lib/wrapped/analytics'
import { wrappedCopy } from '@/lib/i18n/wrapped'
import { createShareCard, downloadCard } from '@/lib/wrapped/share'

function Count({ value, duration = false }: { value: number; duration?: boolean }) {
  const reduced = useReducedMotion()
  const [current, setCurrent] = useState(value)
  useEffect(() => {
    if (reduced !== false) { setCurrent(value); return }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 850)
      setCurrent(Math.round(value * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, reduced])
  return <><span aria-hidden="true">{duration ? focusDuration(current) : current}</span><span className="sr-only">{duration ? focusDuration(value) : value}</span></>
}

export default function WrappedViewer({ report, onClose }: { report: MonthlyWrapped; onClose: () => void }) {
  const { language } = useI18n()
  const copy = wrappedCopy[language]
  const [index, setIndex] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [exportError, setExportError] = useState(false)
  const [exportAttempt, setExportAttempt] = useState(0)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const slides = ['intro', 'focus', 'best', 'rhythm', 'project', ...(report.previousMonth ? ['comparison'] : []), 'streak', 'final']
  const slide = slides[index]
  const move = (delta: number) => setIndex(value => Math.max(0, Math.min(slides.length - 1, value + delta)))
  const shareText = copy.shareText.replace('{time}', focusDuration(report.totalFocusMinutes))
  const slideCount = slides.length
  useEffect(() => {
    const navigate = (event: KeyboardEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('.wrapped-dialog')) return
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
      event.preventDefault()
      setIndex(value => Math.max(0, Math.min(slideCount - 1, value + (event.key === 'ArrowRight' ? 1 : -1))))
    }
    document.addEventListener('keydown', navigate)
    return () => document.removeEventListener('keydown', navigate)
  }, [slideCount])
  useEffect(() => {
    let active = true
    setFile(null); setExportError(false)
    void createShareCard(report, language).then(result => { if (active) setFile(result) }).catch(() => { if (active) setExportError(true) })
    return () => { active = false }
  }, [report, language, exportAttempt])
  const share = async () => {
    if (!file || busy) return
    setBusy(true); setStatus('')
    try {
      if (navigator.canShare?.({ files: [file] }) && navigator.share) await navigator.share({ files: [file], text: shareText, title: copy.title })
      else { downloadCard(file); setStatus(copy.downloaded) }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setStatus(copy.error)
    } finally { setBusy(false) }
  }
  const copyText = async () => {
    try { await navigator.clipboard.writeText(shareText); setStatus(copy.copied) }
    catch { setStatus(copy.error) }
  }
  const weekday = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })
  return <CommunityDialog open title={copy.title} variant="monthly-wrapped" onClose={onClose}>
    <div className="wrapped-story" onTouchStart={event => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY } }} onTouchEnd={event => {
      if (!touch.current) return
      const dx = event.changedTouches[0].clientX - touch.current.x
      const dy = event.changedTouches[0].clientY - touch.current.y
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1)
      touch.current = null
    }}>
      <nav className="wrapped-progress" aria-label={copy.title}>{slides.map((item, i) => <button type="button" key={item} aria-label={`${copy.slide} ${i + 1}`} aria-current={index === i ? 'step' : undefined} data-complete={i <= index} onClick={() => setIndex(i)} />)}</nav>
      <div className="wrapped-meta"><span>POMO COWORK</span><span>{monthLabel(report, language)}</span></div>
      <section key={slide} className={`wrapped-slide wrapped-${slide}`} aria-live="polite" aria-atomic="true">
        {slide === 'intro' && <><div className="wrapped-seal" aria-hidden="true"><Sprout /></div><p className="wrapped-eyebrow">{copy.yourMonth}</p><h3>{copy.intro}</h3><p className="wrapped-note">{copy.ready}</p></>}
        {slide === 'focus' && <><p className="wrapped-eyebrow">{copy.yourMonth}</p><h3 className="wrapped-number"><Count value={report.totalFocusMinutes} duration /></h3><p className="wrapped-label">{copy.focused}</p><p className="wrapped-note"><strong>{report.completedSessions}</strong> {copy.sessions}</p></>}
        {slide === 'best' && report.bestDay && <><Trophy className="wrapped-icon" aria-hidden="true" /><p className="wrapped-eyebrow">{copy.best}</p><h3>{weekday(report.bestDay.date)}</h3><p className="wrapped-label">{focusDuration(report.bestDay.focusMinutes)} {copy.focused}</p><div className="wrapped-month" aria-hidden="true">{report.days.map(day => <div key={day.date}><span style={{ height: `${12 + day.focusMinutes / report.bestDay!.focusMinutes * 80}px` }} data-best={day.date === report.bestDay?.date} /><small>{Number(day.date.slice(-2))}</small></div>)}</div></>}
        {slide === 'rhythm' && <><Clock3 className="wrapped-icon" aria-hidden="true" /><p className="wrapped-eyebrow">{copy.rhythm}</p><h3>{copy.periods[report.favoriteFocusPeriod]}</h3><p className="wrapped-hour">{String(report.favoriteFocusHour ?? 0).padStart(2, '0')}:00</p><p className="wrapped-note">{copy.favorite} · {report.timezone}</p></>}
        {slide === 'project' && <><Target className="wrapped-icon" aria-hidden="true" /><p className="wrapped-eyebrow">{report.topProject ? copy.project : copy.longest}</p><h3 className={report.topProject ? 'wrapped-project-name' : 'wrapped-number'}>{report.topProject?.name ?? <Count value={report.longestSessionMinutes} duration />}</h3><p className="wrapped-label">{report.topProject ? `${focusDuration(report.topProject.focusMinutes)} ${copy.focused}` : copy.focused}</p></>}
        {slide === 'comparison' && report.previousMonth && <><p className="wrapped-eyebrow">{copy.comparison}</p><h3 className="wrapped-number">{report.previousMonth.differenceMinutes > 0 ? '+' : report.previousMonth.differenceMinutes < 0 ? '−' : ''}<Count value={Math.abs(report.previousMonth.differenceMinutes)} duration /></h3><p className="wrapped-label">{report.previousMonth.differenceMinutes > 0 ? copy.more : report.previousMonth.differenceMinutes < 0 ? copy.less : copy.same}</p><p className="wrapped-note">{copy.fallback}</p></>}
        {slide === 'streak' && <><Flame className="wrapped-icon" aria-hidden="true" /><p className="wrapped-eyebrow">{copy.streak}</p><h3 className="wrapped-number"><Count value={report.longestMonthlyStreak} /></h3><p className="wrapped-label">{copy.days}</p><div className="wrapped-streak-grid" aria-hidden="true">{report.days.map(day => <span key={day.date} data-active={day.focusMinutes > 0} />)}</div><p className="wrapped-note">{report.activeDays} / {report.days.length} {copy.active}</p></>}
        {slide === 'final' && <><div className="wrapped-confetti" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ '--i': i } as CSSProperties} />)}</div><p className="wrapped-eyebrow">{copy.yourMonth}</p><h3>{copy.finale}</h3><p className="wrapped-final-number">{focusDuration(report.totalFocusMinutes)}</p><p className="wrapped-label">{copy.focused}</p><p className="wrapped-summary">{report.completedSessions} {copy.sessions}<span>·</span>{report.longestMonthlyStreak} {copy.days}</p>{report.topProject && <p className="wrapped-private-project">{report.topProject.name} · {focusDuration(report.topProject.focusMinutes)}</p>}<p className="wrapped-note">{report.percentile !== null ? `${report.percentile}% ${copy.community}` : copy.fallback}</p><p className="wrapped-goal">{copy.goal} {Math.floor(report.totalFocusMinutes / 60) + 1}h. {copy.next}</p><div className="wrapped-share"><button type="button" className="wrapped-primary" disabled={!file || busy} onClick={() => { void share() }}><Share2 size={17} />{copy.share}</button><div><button type="button" disabled={!file || busy} onClick={() => { if (file) { downloadCard(file); setStatus(copy.downloaded) } }}><Download size={15} />{copy.download}</button><button type="button" onClick={() => { void copyText() }}><Copy size={15} />{copy.copy}</button></div><small>{copy.privacy}</small>{exportError && <p role="alert">{copy.error} <button type="button" onClick={() => setExportAttempt(value => value + 1)}>{copy.retry}</button></p>}<p className="wrapped-status" role="status">{status}</p></div></>}
      </section>
      <footer className="wrapped-navigation"><button type="button" aria-label={copy.back} disabled={index === 0} onClick={() => move(-1)}><ArrowLeft size={18} /></button><span>{index + 1} / {slides.length}</span><button type="button" className={index === 0 ? 'wrapped-primary' : ''} onClick={slide === 'final' ? onClose : () => move(1)} aria-label={index === 0 ? copy.show : slide === 'final' ? copy.done : copy.forward}>{index === 0 ? copy.show : slide === 'final' ? copy.done : ''}{slide !== 'final' && <ArrowRight size={18} />}</button></footer>
    </div>
  </CommunityDialog>
}
