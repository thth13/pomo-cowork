'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { GripHorizontal, X } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { gardenCopy } from '@/lib/i18n/garden'

interface WorkspaceWindowProps {
  id: string
  title: string
  open: boolean
  offset: number
  layer: number
  onActivate: () => void
  onClose: () => void
  children: ReactNode
}

export default function WorkspaceWindow({ id, title, open, offset, layer, onActivate, onClose, children }: WorkspaceWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLButtonElement>(null)
  const positionRef = useRef<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const { t, language } = useI18n()

  const moveTo = (x: number, y: number) => {
    const panel = windowRef.current
    if (!panel) return
    const next = {
      x: Math.max(8, Math.min(x, window.innerWidth - panel.offsetWidth - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - panel.offsetHeight - 8)),
    }
    positionRef.current = next
    setPosition(next)
  }

  useEffect(() => {
    if (!open) return
    const panel = windowRef.current
    if (!panel) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const fit = () => {
      const current = positionRef.current
      moveTo(current?.x ?? window.innerWidth - panel.offsetWidth - 16 - offset, current?.y ?? 96 + offset)
    }
    fit()
    handleRef.current?.focus({ preventScroll: true })
    const observer = new ResizeObserver(fit)
    observer.observe(panel)
    window.addEventListener('resize', fit)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', fit)
      dragRef.current = null
      setDragging(false)
      if (panel.contains(document.activeElement)) trigger?.focus({ preventScroll: true })
    }
  }, [open, offset])

  return (
    <div
      ref={windowRef}
      id={id}
      role="dialog"
      aria-labelledby={`${id}-title`}
      hidden={!open}
      className="workspace-window"
      style={{ left: position?.x, top: position?.y, zIndex: 40 + layer }}
      onPointerDownCapture={onActivate}
      onFocusCapture={onActivate}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.defaultPrevented) {
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <div className="workspace-window-heading" data-no-translate>
        <button
          ref={handleRef}
          type="button"
          className="workspace-window-handle"
          data-dragging={dragging}
          aria-label={`${title}. ${gardenCopy[language].moveWindow}`}
          title={gardenCopy[language].moveWindow}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            const bounds = windowRef.current!.getBoundingClientRect()
            dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: bounds.left, top: bounds.top }
            event.currentTarget.setPointerCapture(event.pointerId)
            setDragging(true)
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current
            if (!drag || drag.pointerId !== event.pointerId) return
            moveTo(drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y)
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
            dragRef.current = null
            setDragging(false)
          }}
          onPointerCancel={() => { dragRef.current = null; setDragging(false) }}
          onLostPointerCapture={() => { dragRef.current = null; setDragging(false) }}
          onKeyDown={(event) => {
            const current = positionRef.current
            if (!current || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
            event.preventDefault()
            const step = event.shiftKey ? 40 : 10
            moveTo(current.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), current.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0))
          }}
        >
          <GripHorizontal size={16} aria-hidden="true" />
          <span id={`${id}-title`}>{title}</span>
        </button>
        <button type="button" className="workspace-window-close" onClick={onClose} aria-label={t.common.close}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="workspace-window-content">{children}</div>
    </div>
  )
}
