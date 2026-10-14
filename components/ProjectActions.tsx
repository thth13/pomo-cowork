'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'

export default function ProjectActions({ title, disabled, onRename, onDelete, kind = 'project' }: {
  title: string
  disabled: boolean
  onRename: () => void
  onDelete: () => void
  kind?: 'project' | 'task'
}) {
  const { language } = useI18n()
  const text = (en: string, es: string) => language === 'es' ? es : en
  const id = useId()
  const actionsLabel = kind === 'task' ? text('Task actions', 'Acciones de la tarea') : text('Project actions', 'Acciones del proyecto')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  function close(restoreFocus = false) {
    setPosition(null)
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true })
  }

  function open(last = false) {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    setPosition({
      left: Math.max(8, Math.min(rect.right - 160, window.innerWidth - 168)),
      top: rect.bottom + 108 > window.innerHeight ? Math.max(8, rect.top - 108) : rect.bottom + 4,
    })
    requestAnimationFrame(() => {
      const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('button')
      items?.[last ? items.length - 1 : 0]?.focus()
    })
  }

  useEffect(() => {
    if (!position) return
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) setPosition(null)
    }
    const dismiss = (event: Event) => {
      if (!(event.target instanceof Node) || !menuRef.current?.contains(event.target)) {
        setPosition(null)
        if (menuRef.current?.contains(document.activeElement)) triggerRef.current?.focus({ preventScroll: true })
      }
    }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', dismiss)
    document.addEventListener('scroll', dismiss, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', dismiss)
      document.removeEventListener('scroll', dismiss, true)
    }
  }, [position])

  return <>
    <button ref={triggerRef} type="button" className={`focus-project-actions-trigger${kind === 'task' ? ' focus-task-actions-trigger' : ''}`} disabled={disabled} aria-label={`${actionsLabel}: ${title}`} aria-haspopup="menu" aria-expanded={Boolean(position)} aria-controls={position ? id : undefined}
      onClick={() => position ? close(true) : open()} onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(event.key === 'ArrowUp') }
      }}><svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true"><circle cx="9" cy="4" r="1.4" /><circle cx="9" cy="9" r="1.4" /><circle cx="9" cy="14" r="1.4" /></svg></button>
    {position && createPortal(<div ref={menuRef} id={id} role="menu" aria-label={`${actionsLabel}: ${title}`} className="focus-project-actions-menu" data-i18n-ignore style={position}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close() }}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true) }
        if (event.key === 'Tab') { close(true) }
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
        const index = items.indexOf(document.activeElement as HTMLButtonElement)
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault()
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
          items[next]?.focus()
        }
      }}>
      <button type="button" role="menuitem" tabIndex={-1} disabled={disabled} onClick={() => { close(true); onRename() }}><Pencil size={15} aria-hidden="true" />{text('Rename', 'Renombrar')}</button>
      <button type="button" role="menuitem" tabIndex={-1} className="focus-project-actions-danger" disabled={disabled} onClick={() => { close(true); onDelete() }}><Trash2 size={15} aria-hidden="true" />{text('Delete', 'Eliminar')}</button>
    </div>, document.body)}
  </>
}
