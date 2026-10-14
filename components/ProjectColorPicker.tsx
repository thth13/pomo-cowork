'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { PROJECT_COLORS, projectColorStyle } from '@/lib/projectColors'

export default function ProjectColorPicker({ value, onChange, disabled = false }: {
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}) {
  const { language } = useI18n()
  const es = language === 'es'
  const label = es ? 'Color del proyecto' : 'Project color'
  const choices = [...PROJECT_COLORS, { value: null, en: 'No color', es: 'Sin color' }]
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const isOpen = Boolean(position) && !disabled
  const selected = choices.find(choice => choice.value === value) ?? choices[0]
  function close(restore = false) {
    setPosition(null)
    if (restore) trigger.current?.focus({ preventScroll: true })
  }
  function updatePosition() {
    const rect = trigger.current?.getBoundingClientRect()
    if (!rect) return
    const width = menu.current?.offsetWidth ?? 162
    const height = menu.current?.offsetHeight ?? (Math.ceil(choices.length / 5) * 30 + 12)
    const viewport = window.visualViewport
    const left = (viewport?.offsetLeft ?? 0) + 8
    const top = (viewport?.offsetTop ?? 0) + 8
    const right = (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth) - 8
    const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - 8
    const preferredTop = rect.bottom + height + 4 > bottom ? rect.top - height - 4 : rect.bottom + 4
    const next = { left: Math.max(left, Math.min(rect.right - width, right - width)), top: Math.max(top, Math.min(preferredTop, bottom - height)) }
    setPosition(previous => previous?.left === next.left && previous?.top === next.top ? previous : next)
  }
  function open() {
    updatePosition()
  }
  useLayoutEffect(() => {
    const palette = menu.current
    if (!isOpen || !palette) return
    // Keep the palette inside the modal's DOM while escaping its blur and overflow.
    palette.setAttribute('popover', 'manual')
    palette.showPopover()
    updatePosition()
    palette.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus({ preventScroll: true })
    return () => { if (palette.matches(':popover-open')) palette.hidePopover() }
  }, [isOpen])
  useEffect(() => {
    if (!position) return
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) close()
    }
    const reposition = (event: Event) => {
      if (!(event.target instanceof Node) || !menu.current?.contains(event.target)) updatePosition()
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    window.visualViewport?.addEventListener('resize', reposition)
    window.visualViewport?.addEventListener('scroll', reposition)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
      window.visualViewport?.removeEventListener('resize', reposition)
      window.visualViewport?.removeEventListener('scroll', reposition)
    }
  }, [position])
  useEffect(() => { if (disabled) setPosition(null) }, [disabled])
  return <>
    <button ref={trigger} type="button" className="project-color-trigger" disabled={disabled} aria-label={`${label}: ${es ? selected.es : selected.en}`} title={label} aria-haspopup="menu" aria-expanded={Boolean(position)} aria-controls={position ? id : undefined} onClick={() => position ? close(true) : open()} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open() }
    }}><span className="project-color-dot" style={projectColorStyle(value)} /></button>
    {position && !disabled && createPortal(<div id={id} ref={menu} role="menu" aria-label={label} className="project-color-menu" style={position} data-i18n-ignore onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close() }} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true) }
      if (event.key === 'Tab') close(true)
      const items = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      const index = items.indexOf(document.activeElement as HTMLButtonElement)
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
        const delta = event.key === 'ArrowDown' ? 5 : event.key === 'ArrowUp' ? -5 : event.key === 'ArrowLeft' ? -1 : 1
        items[event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + delta + items.length) % items.length]?.focus({ preventScroll: true })
      }
    }}>
      {choices.map(choice => <button key={choice.value ?? 'none'} type="button" role="menuitemradio" aria-checked={choice.value === selected.value} aria-label={es ? choice.es : choice.en} title={es ? choice.es : choice.en} tabIndex={-1} onClick={() => { onChange(choice.value); close(true) }}>
        <span className="project-color-dot" style={projectColorStyle(choice.value)}>
          {choice.value === selected.value && <Check size={14} strokeWidth={3} aria-hidden="true" />}
        </span>
      </button>)}
    </div>, trigger.current?.closest('dialog') ?? document.body)}
  </>
}
