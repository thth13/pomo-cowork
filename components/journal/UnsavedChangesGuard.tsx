'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useJournalText } from '@/lib/journal/client'
export default function UnsavedChangesGuard({
  dirty,
  onDiscard
}: {
  dirty: boolean;
  onDiscard: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    returnFocus = useRef<HTMLElement | null>(null),
    [destination, setDestination] = useState(''),
    router = useRouter(),
    t = useJournalText()
  useEffect(() => {
    if (!dirty) return
    const listener = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target instanceof Element ? event.target.closest('a') : null
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download') || anchor.getAttribute('href')?.startsWith('#')) return
      event.preventDefault()
      event.stopPropagation()
      returnFocus.current = anchor
      setDestination(anchor.href)
      dialog.current?.showModal()
    }
    document.addEventListener('click', listener, true)
    return () => document.removeEventListener('click', listener, true)
  }, [dirty])
  const close = () => {
    dialog.current?.close()
    returnFocus.current?.focus()
  }
  return <dialog ref={dialog} className="journal-discard-dialog" aria-labelledby="discard-heading" onCancel={() => returnFocus.current?.focus()}>
    <h2 id="discard-heading">{t('Leave without saving?', '¿Salir sin guardar?')}</h2>
    <p>{t('Your unsaved changes will be discarded.', 'Se descartarán los cambios sin guardar.')}</p>
    <div className="journal-actions">
      <button type="button" autoFocus onClick={close}>{t('Keep editing', 'Seguir editando')}</button>
      <button type="button" onClick={() => {
        onDiscard()
        close()
        const url = new URL(destination)
        if (url.origin === location.origin) router.push(url.pathname + url.search + url.hash);else setTimeout(() => location.assign(url.href), 0)
      }}>
        {t('Discard and leave', 'Descartar y salir')}
      </button>
    </div>
  </dialog>
}
