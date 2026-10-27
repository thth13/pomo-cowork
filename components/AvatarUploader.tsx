'use client'

import { useRef, useState } from 'react'
import { Upload, User, X } from 'lucide-react'
import Image from 'next/image'
import { useI18n } from '@/components/I18nProvider'

interface AvatarUploaderProps {
  currentAvatar?: string
  onFileSelect: (file: File | null) => void
  previewUrl?: string | null
  removed?: boolean
  disabled?: boolean
  onUndoRemove?: () => void
}

export default function AvatarUploader({ currentAvatar, onFileSelect, previewUrl, removed = false, disabled = false, onUndoRemove }: AvatarUploaderProps) {
  const { t } = useI18n()
  const copy = t.settingsProfile
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const preview = previewUrl || currentAvatar

  const selectFile = (file: File) => {
    if (disabled) return
    if (!file.type.startsWith('image/')) {
      setError(copy.invalidImage)
      return
    }
    if (file.size > 4.5 * 1024 * 1024) {
      setError(copy.fileTooLarge)
      return
    }
    setError('')
    onFileSelect(file)
  }

  return (
    <div className="settings-avatar-card" data-i18n-ignore>
      <div>
        <p className="settings-profile-eyebrow">{copy.avatarHeading}</p>
        <h3>{copy.avatarTitle}</h3>
        <p className="settings-avatar-description">{copy.avatarDescription}</p>
      </div>
      <div className="settings-avatar-preview">
        <div className="settings-avatar-image">
          {preview ? (
            <Image src={preview} alt={copy.avatarAlt} width={128} height={128} className="h-full w-full object-cover" />
          ) : (
            <User size={48} aria-hidden="true" />
          )}
        </div>
        {preview && <button type="button" disabled={disabled} className="settings-avatar-undo" aria-label={copy.removePhoto} title={copy.removePhoto} onClick={() => {
          onFileSelect(null)
          setError('')
        }}><X size={16} aria-hidden="true" /></button>}
      </div>
      {removed && <div className="settings-profile-hint">
        <p>{copy.removalHint}</p>
        <button type="button" disabled={disabled} className="underline underline-offset-4 hover:no-underline" onClick={onUndoRemove}>{copy.undo}</button>
      </div>}
      <div
        className={`settings-avatar-dropzone${isDragging ? ' is-dragging' : ''}`}
        onDragOver={(event) => { event.preventDefault(); if (!disabled) setIsDragging(true) }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false) }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          const file = event.dataTransfer.files[0]
          if (file) selectFile(file)
        }}
      >
        <div className="settings-avatar-drop-label">
          <span className="settings-avatar-upload-icon"><Upload size={19} aria-hidden="true" /></span>
          <div><p>{copy.dropPhoto}</p><small>{copy.photoHint}</small></div>
        </div>
        <button type="button" disabled={disabled} className="settings-avatar-change" onClick={() => fileInputRef.current?.click()}>{copy.chooseFile}</button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>}
      <input
        ref={fileInputRef}
        type="file"
        disabled={disabled}
        accept="image/*"
        aria-label={copy.changePhoto}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) selectFile(file)
        }}
      />
    </div>
  )
}
