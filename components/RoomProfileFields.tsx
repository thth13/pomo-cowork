'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ImageIcon, DoorOpen, Upload, X } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { ROOM_DESCRIPTION_LIMIT, ROOM_IMAGE_LIMIT, ROOM_IMAGE_TYPES, type RoomProfileDraft } from '@/lib/roomProfile'

const messages = {
  en: { description: 'Room description', hint: 'What do you work on together?', avatar: 'Room avatar', background: 'Background image', remove: 'Remove image', imageHint: 'JPG, PNG, WebP or GIF · Up to 2 MB each', invalid: 'Choose a JPG, PNG, WebP or GIF image up to 2 MB.', preview: 'Room images', choose: 'Choose image', drop: 'Drop image here', drag: 'or drag it here', replace: 'Replace image', single: 'Drop one image at a time.' },
  es: { description: 'Descripción de la sala', hint: '¿En qué trabajan juntos?', avatar: 'Avatar de la sala', background: 'Imagen de fondo', remove: 'Eliminar imagen', imageHint: 'JPG, PNG, WebP o GIF · Hasta 2 MB cada una', invalid: 'Elige una imagen JPG, PNG, WebP o GIF de hasta 2 MB.', preview: 'Imágenes de la sala', choose: 'Elegir imagen', drop: 'Suelta la imagen aquí', drag: 'o arrástrala aquí', replace: 'Cambiar imagen', single: 'Suelta una imagen a la vez.' },
}

export default function RoomProfileFields({ value, onChange, disabled = false }: {
  value: RoomProfileDraft; onChange: (value: RoomProfileDraft) => void; disabled?: boolean
}) {
  const { language } = useI18n()
  const copy = messages[language]
  return <>
    <label className="community-field"><span>{copy.description}</span>
      <textarea value={value.description} placeholder={copy.hint} maxLength={ROOM_DESCRIPTION_LIMIT} rows={4} className="resize-none" disabled={disabled} onChange={event => onChange({ ...value, description: event.target.value })} />
      <small className="community-muted">{value.description.length}/{ROOM_DESCRIPTION_LIMIT}</small>
    </label>
  </>
}

function ImagePreview({ label, url, file, background = false, disabled, onChange }: {
  label: string; url: string | null; file?: File; background?: boolean; disabled: boolean
  onChange: (file?: File, remove?: boolean) => void
}) {
  const { language } = useI18n()
  const copy = messages[language]
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  useEffect(() => {
    if (!file) { setPreview(null); return }
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])
  useEffect(() => {
    if (disabled) { dragDepth.current = 0; setDragging(false) }
  }, [disabled])
  const selectFile = (files: FileList | null) => {
    if (disabled || !files?.length) return
    if (files.length !== 1) { setError(copy.single); return }
    const selected = files[0]
    if (!ROOM_IMAGE_TYPES.includes(selected.type) || !selected.size || selected.size > ROOM_IMAGE_LIMIT) { setError(copy.invalid); return }
    setError('')
    onChange(selected)
  }
  const src = preview || url
  const Icon = background ? ImageIcon : DoorOpen
  return <div className="room-profile-preview-item">
    <div className="room-upload-heading"><span id={`${id}-label`}>{label}</span>
      {(file || url) && <button type="button" className="community-icon-button room-upload-remove" disabled={disabled} aria-label={`${copy.remove}: ${label}`} title={copy.remove} onClick={() => { setError(''); onChange(undefined, true) }}><X size={15} aria-hidden="true" /></button>}
    </div>
    <input ref={inputRef} type="file" accept={ROOM_IMAGE_TYPES.join(',')} hidden disabled={disabled} aria-label={label} onChange={event => { selectFile(event.target.files); event.target.value = '' }} />
    <button type="button" className={`room-upload-zone${background ? ' room-upload-cover' : ''}`} data-dragging={dragging && !disabled} data-filled={Boolean(src && src !== failedSrc)} disabled={disabled}
      aria-labelledby={`${id}-label ${id}-action`} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`} aria-invalid={Boolean(error)}
      onClick={() => inputRef.current?.click()}
      onDragEnter={event => { event.preventDefault(); if (!disabled) { dragDepth.current += 1; setDragging(true) } }}
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = disabled ? 'none' : 'copy' }}
      onDragLeave={event => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false) }}
      onDrop={event => { event.preventDefault(); dragDepth.current = 0; setDragging(false); selectFile(event.dataTransfer.files) }}>
      <span className="room-upload-art">
        {src && src !== failedSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" onError={() => setFailedSrc(src)} />
        ) : <Icon size={32} strokeWidth={1.25} aria-hidden="true" />}
      </span>
      <span className="room-upload-caption"><span id={`${id}-action`}><Upload size={14} aria-hidden="true" />{dragging ? copy.drop : src ? copy.replace : copy.choose}</span><small>{copy.drag}</small></span>
    </button>
    <p id={`${id}-hint`} className="room-upload-hint">{copy.imageHint}</p>
    {file && <p className="room-upload-filename" title={file.name}>{file.name}</p>}
    {error && <p id={`${id}-error`} className="community-error" role="alert">{error}</p>}
  </div>
}

export function RoomProfilePreview({ value, onChange, disabled = false }: {
  value: RoomProfileDraft; onChange: (value: RoomProfileDraft) => void; disabled?: boolean
}) {
  const { language } = useI18n()
  const copy = messages[language]
  return <aside className="room-profile-previews" aria-label={copy.preview}>
    <ImagePreview label={copy.avatar} url={value.avatarUrl} file={value.avatarFile} disabled={disabled} onChange={(file, remove) => onChange({ ...value, avatarFile: file, avatarUrl: remove ? null : value.avatarUrl })} />
    <ImagePreview label={copy.background} url={value.backgroundImageUrl} file={value.backgroundFile} background disabled={disabled} onChange={(file, remove) => onChange({ ...value, backgroundFile: file, backgroundImageUrl: remove ? null : value.backgroundImageUrl })} />
  </aside>
}
