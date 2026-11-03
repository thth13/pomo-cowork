'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ImagePlus, Upload, X } from 'lucide-react'
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
  max = 4,
  variant,
  label
}: {
  images: string[];
  onChange: (images: string[]) => void;
  onBusy: (busy: boolean) => void;
  max?: number;
  variant?: 'logo' | 'cover';
  label?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    t = useJournalText()
  const inputRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLButtonElement>(null)
  const uploadLock = useRef(false)
  const helpId = useId()
  const [preview, setPreview] = useState<string | null>(null)
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || uploadLock.current) return
    setError('')
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size || file.size > 2 * 1024 * 1024) {
      setError(t('Choose a PNG, JPEG or WebP image up to 2 MB.', 'Elige una imagen PNG, JPEG o WebP de hasta 2 MB.'))
      return
    }
    uploadLock.current = true
    setBusy(true)
    onBusy(true)
    if (variant) setPreview(URL.createObjectURL(file))
    try {
      const body = new FormData()
      body.append('image', file)
      const result = await journalApi<{ url: string }>('images', { method: 'POST', body })
      onChange(variant ? [result.url] : [...images, result.url])
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Upload failed. Please try again.', 'No se pudo subir la imagen. Inténtalo de nuevo.'))
    } finally {
      uploadLock.current = false
      setBusy(false)
      onBusy(false)
      setPreview(null)
    }
  }
  if (variant) {
    const action = images[0] ? t('Replace image', 'Cambiar imagen') : t('Upload image', 'Subir imagen')
    return <div className={`journal-image-picker journal-image-picker--${variant}`}>
      <input ref={inputRef} className="journal-image-picker-input" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} aria-label={label || action} tabIndex={-1} onChange={upload} />
      <div className="journal-image-picker-frame">
        <button ref={pickerRef} type="button" className="journal-image-picker-target" disabled={busy} aria-busy={busy} aria-label={`${action}: ${label || variant}`} aria-describedby={helpId} onClick={() => inputRef.current?.click()}>
          {preview || images[0] ? <>
            <JournalImage key={preview || images[0]} src={preview || images[0]} alt={label || t('Image preview', 'Vista previa de imagen')} />
            <span className="journal-image-picker-caption"><Upload size={14} aria-hidden="true" />{busy ? t('Uploading…', 'Subiendo…') : action}</span>
          </> : <span className="journal-image-picker-empty">
            <ImagePlus size={26} strokeWidth={1.4} aria-hidden="true" />
            <span>{variant === 'logo' ? t('Add logo', 'Añadir logotipo') : t('Add cover', 'Añadir portada')}</span>
            <small>{variant === 'logo' ? t('Square image', 'Imagen cuadrada') : t('Wide image · 4:1', 'Imagen panorámica · 4:1')}</small>
          </span>}
        </button>
        {images[0] && <button type="button" className="journal-image-picker-remove" disabled={busy} aria-label={t('Remove image', 'Quitar imagen')} title={t('Remove image', 'Quitar imagen')} onClick={() => { onChange([]); setError(''); pickerRef.current?.focus() }}><X size={15} aria-hidden="true" /></button>}
      </div>
      <small id={helpId}>{t('PNG, JPEG or WebP · up to 2 MB', 'PNG, JPEG o WebP · hasta 2 MB')}</small>
      <span className="sr-only" role="status">{busy ? t('Uploading…', 'Subiendo…') : ''}</span>
      {error && <p className="journal-field-error" role="alert">{error}</p>}
    </div>
  }
  return <div>
    <div className="journal-upload">
      <label>
        {t('Add image', 'Añadir imagen')}
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || images.length >= max} onChange={upload} />
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
