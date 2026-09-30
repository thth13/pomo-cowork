'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { journalApi, useJournalText } from '@/lib/journal/client'
import { JournalImage } from './Primitives'
export function Field({
  label,
  name,
  error,
  ...props
}: {
  label: string;
  name: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label>
    {label}
    <input name={name} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} {...props} />
    {error && <span id={`${name}-error`} className="journal-field-error">{error}</span>}
  </label>
}
export function Area({
  label,
  name,
  error,
  ...props
}: {
  label: string;
  name: string;
  error?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <label>
    {label}
    <textarea name={name} className="resize-none" aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} {...props} />
    {error && <span id={`${name}-error`} className="journal-field-error">{error}</span>}
  </label>
}
export function CancelEdit({
  dirty,
  href
}: {
  dirty: boolean;
  href: string;
}) {
  const [confirm, setConfirm] = useState(false),
    router = useRouter(),
    t = useJournalText()
  return confirm ? <div className="journal-confirm">
    <p>{t('Discard your unsaved changes?', '¿Descartar los cambios sin guardar?')}</p>
    <button type="button" onClick={() => setConfirm(false)}>{t('Keep editing', 'Seguir editando')}</button>
    <button type="button" onClick={() => router.push(href)}>{t('Discard changes', 'Descartar cambios')}</button>
  </div> : <button type="button" onClick={() => dirty ? setConfirm(true) : router.push(href)}>{t('Cancel', 'Cancelar')}</button>
}
export function ImageAttachments({
  images,
  onChange,
  onBusy,
  max = 4
}: {
  images: string[];
  onChange: (images: string[]) => void;
  onBusy: (busy: boolean) => void;
  max?: number;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    t = useJournalText()
  return <div>
    <div className="journal-upload">
      <label>
        {t('Add image', 'Añadir imagen')}
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || images.length >= max} onChange={async event => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          setBusy(true)
          onBusy(true)
          setError('')
          try {
            const body = new FormData()
            body.append('image', file)
            const result = await journalApi<{
              url: string;
            }>('images', {
              method: 'POST',
              body
            })
            onChange([...images, result.url])
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Upload failed')
          } finally {
            setBusy(false)
            onBusy(false)
          }
        }} />
      </label>
      <small>{t('PNG, JPEG or WebP · up to 2 MB each', 'PNG, JPEG o WebP · hasta 2 MB por imagen')}</small>
    </div>
    {busy && <p role="status">{t('Uploading…', 'Subiendo…')}</p>}
    {error && <p role="alert">{error}</p>}
    <div className="journal-grid">
      {images.map((src, index) => <div key={src}>
        <JournalImage src={src} alt={t('Attached image', 'Imagen adjunta')} />
        <button type="button" disabled={busy} onClick={() => onChange(images.filter((_, i) => i !== index))}>
          {t('Remove image', 'Quitar imagen')}
          {' '}
          {index + 1}
        </button>
      </div>)}
    </div>
  </div>
}
