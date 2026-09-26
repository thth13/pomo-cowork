'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { GripHorizontal, X } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { gardenCopy } from '@/lib/i18n/garden'

const resizeEdges = ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'] as const
type ResizeEdge = (typeof resizeEdges)[number]

interface WindowGeometry {
  position: { x: number; y: number }
  size: { width: number; height: number } | null
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

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
  const resizeRef = useRef<{ pointerId: number; x: number; y: number; bounds: DOMRect; edge: ResizeEdge } | null>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const { t, language } = useI18n()
  const storageKey = `pomo:window:${id}:v1`
  const [geometryLoaded, setGeometryLoaded] = useState(false)
  const savedGeometryRef = useRef<WindowGeometry | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      const saved = raw ? JSON.parse(raw) : null
      if (saved && isFiniteNumber(saved.position?.x) && isFiniteNumber(saved.position?.y)) {
        const restoredPosition = { x: saved.position.x, y: saved.position.y }
        positionRef.current = restoredPosition
        setPosition(restoredPosition)
        if (isFiniteNumber(saved.size?.width) && isFiniteNumber(saved.size?.height) && saved.size.width > 0 && saved.size.height > 0) {
          setSize({
            width: Math.min(Math.max(280, saved.size.width), Math.max(1, window.innerWidth - 16)),
            height: Math.min(Math.max(240, saved.size.height), Math.max(1, window.innerHeight - 16)),
          })
        }
      }
    } catch {
      // Invalid or unavailable storage must not prevent using the windows.
    }
    setGeometryLoaded(true)
  }, [storageKey])

  const persistGeometry = useCallback(() => {
    if (!savedGeometryRef.current) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(savedGeometryRef.current))
    } catch {
      // Keep the current geometry in memory when browser storage is unavailable.
    }
  }, [storageKey])

  useEffect(() => {
    if (!geometryLoaded || !position) return
    savedGeometryRef.current = { position, size }
    const timeout = window.setTimeout(persistGeometry, 200)
    return () => window.clearTimeout(timeout)
  }, [geometryLoaded, position, size, persistGeometry])

  useEffect(() => {
    window.addEventListener('pagehide', persistGeometry)
    return () => {
      window.removeEventListener('pagehide', persistGeometry)
      persistGeometry()
    }
  }, [persistGeometry])

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

  const resizeFrom = (bounds: DOMRect, edge: ResizeEdge, dx: number, dy: number) => {
    let { left, top, right, bottom } = bounds
    // Keep the opposite edge stationary, including near viewport boundaries.
    const minWidth = Math.min(280, bounds.width)
    const minHeight = Math.min(240, bounds.height)
    if (edge.includes('w')) left = Math.max(8, Math.min(right - minWidth, left + dx))
    if (edge.includes('e')) right = Math.min(window.innerWidth - 8, Math.max(left + minWidth, right + dx))
    if (edge.includes('n')) top = Math.max(8, Math.min(bottom - minHeight, top + dy))
    if (edge.includes('s')) bottom = Math.min(window.innerHeight - 8, Math.max(top + minHeight, bottom + dy))
    const next = { x: left, y: top }
    positionRef.current = next
    setPosition(next)
    setSize({ width: right - left, height: bottom - top })
  }

  useEffect(() => {
    if (!open || !geometryLoaded) return
    const panel = windowRef.current
    if (!panel) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const fit = () => {
      const current = positionRef.current
      moveTo(current?.x ?? window.innerWidth - panel.offsetWidth - 16 - offset, current?.y ?? 96 + offset)
    }
    fit()
    // Restoring saved windows must not steal focus on page load.
    if (trigger?.getAttribute('aria-controls') === id) {
      handleRef.current?.focus({ preventScroll: true })
    }
    const observer = new ResizeObserver(fit)
    observer.observe(panel)
    window.addEventListener('resize', fit)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', fit)
      dragRef.current = null
      resizeRef.current = null
      setDragging(false)
      if (panel.contains(document.activeElement)) trigger?.focus({ preventScroll: true })
    }
  }, [open, offset, geometryLoaded, id])

  return (
    <div
      ref={windowRef}
      id={id}
      role="dialog"
      aria-labelledby={`${id}-title`}
      hidden={!open}
      className="workspace-window"
      data-resized={size ? "true" : undefined}
      style={{ left: position?.x, top: position?.y, width: size?.width, height: size?.height, zIndex: 40 + layer }}
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
      {resizeEdges.map((edge) => (
        <button
          key={edge}
          tabIndex={edge === 'se' ? 0 : -1}
          type="button"
          className={`workspace-window-resize workspace-window-resize-${edge}`}
          aria-label={`${title}. ${gardenCopy[language].resizeWindow}`}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            const bounds = windowRef.current!.getBoundingClientRect()
            resizeRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, bounds, edge }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            const resize = resizeRef.current
            if (!resize || resize.pointerId !== event.pointerId) return
            resizeFrom(resize.bounds, resize.edge, event.clientX - resize.x, event.clientY - resize.y)
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
            resizeRef.current = null
          }}
          onPointerCancel={() => { resizeRef.current = null }}
          onLostPointerCapture={() => { resizeRef.current = null }}
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
            event.preventDefault()
            const panel = windowRef.current
            if (!panel) return
            const step = event.shiftKey ? 40 : 10
            resizeFrom(panel.getBoundingClientRect(), edge, event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0, event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0)
          }}
        />
      ))}
    </div>
  )
}
