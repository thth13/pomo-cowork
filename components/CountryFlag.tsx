'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function CountryFlag({ flag, name }: { flag: string; name: string }) {
  const tooltipId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState<{ left: number; bottom: number } | null>(null)

  const showTooltip = () => {
    const bounds = triggerRef.current?.getBoundingClientRect()
    if (!bounds) return
    setPosition({
      left: Math.max(8, Math.min(bounds.left, window.innerWidth - 248)),
      bottom: window.innerHeight - bounds.top,
    })
  }

  useEffect(() => {
    if (!position) return
    const hideTooltip = () => setPosition(null)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hideTooltip()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', hideTooltip, true)
    window.addEventListener('resize', hideTooltip)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', hideTooltip, true)
      window.removeEventListener('resize', hideTooltip)
    }
  }, [position])

  return (
    <span className="inline-flex" onMouseLeave={() => setPosition(null)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={name}
        aria-describedby={position ? tooltipId : undefined}
        className="inline-flex cursor-help rounded text-xl hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:hover:bg-slate-800"
        onMouseEnter={showTooltip}
        onFocus={showTooltip}
        onBlur={() => setPosition(null)}
        onClick={showTooltip}
      >
        <span aria-hidden="true">{flag}</span>
      </button>
      {position && createPortal(
        <span
          className="fixed z-[70] w-max max-w-[min(240px,calc(100vw-16px))] pb-2"
          style={position}
        >
          <span
            id={tooltipId}
            role="tooltip"
            className="block whitespace-normal break-words rounded-[3px] border border-[var(--pixel-line)] bg-[var(--pixel-paper)] px-3 py-2 text-left text-xs font-medium leading-normal text-[var(--pixel-ink)] shadow-[3px_3px_0_var(--pixel-shadow)]"
          >
            {name}
          </span>
        </span>,
        document.body,
      )}
    </span>
  )
}
