'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, X, User } from 'lucide-react'

interface AvatarUploaderProps {
  currentAvatar?: string
  onUploadComplete: (avatarUrl: string) => void
}

export default function AvatarUploader({ currentAvatar, onUploadComplete }: AvatarUploaderProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatar || null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    setError(null)

    // Валидация
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Файл слишком большой (макс. 5MB)')
      return
    }

    // Preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload
    await uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')

      // Создаём FormData для отправки файла
      const formData = new FormData()
      formData.append('avatar', file)

      // Загружаем файл через backend
      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки файла')
      }

      const userData = await response.json()
      onUploadComplete(userData.avatarUrl)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      setPreview(currentAvatar || null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group relative isolate w-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white/95 via-white to-slate-50 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:border-slate-700 dark:from-slate-900/80 dark:via-slate-900/80 dark:to-slate-950"
    >
      <div className="pointer-events-none absolute inset-x-10 -top-24 h-48 rounded-full bg-primary-500/10 blur-3xl dark:bg-primary-400/10" />

      <div className="relative flex w-full flex-col items-center gap-6 p-6 text-center md:items-start md:text-left">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Profile avatar
          </p>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Freshen up your presence
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Drop a crisp square image for the best look. We recommend at least 256×256px.
          </p>
        </div>

        <div className="relative">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-inner transition-all duration-300 group-hover:shadow-xl dark:border-slate-700 dark:bg-slate-800">
            {preview ? (
              <img src={preview} alt="Avatar preview" className="h-full w-full object-cover" />
            ) : (
              <User className="h-14 w-14 text-slate-400 dark:text-slate-500" />
            )}
          </div>

          {preview && !isUploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/90 text-slate-600 shadow-md transition hover:-translate-y-0.5 hover:border-red-500/50 hover:bg-red-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-red-500/60"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-slate-900/50 backdrop-blur-sm">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
            </div>
          )}
        </div>

        <motion.div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`group flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-5 transition-all duration-200 md:items-start ${
            isDragging
              ? 'border-primary-400 bg-primary-50/90 shadow-sm dark:border-primary-400/70 dark:bg-primary-900/20'
              : 'border-slate-300/80 hover:border-primary-400 hover:bg-primary-50/40 dark:border-slate-600 dark:hover:border-primary-500 dark:hover:bg-primary-900/10'
          }`}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            disabled={isUploading}
          />

          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <Upload className="h-5 w-5" />
            </span>
            <div className="text-left">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Drag & drop your avatar
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                PNG, JPG, GIF up to 5MB
              </p>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-primary-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/70 disabled:cursor-not-allowed disabled:bg-primary-400/70"
            disabled={isUploading}
          >
            {isUploading ? 'Uploading…' : 'Choose a file'}
          </button>
        </motion.div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-lg border border-red-400/30 bg-red-50/60 p-3 text-sm text-red-600 shadow-sm dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
          >
            {error}
          </motion.p>
        )}
      </div>
    </motion.div>
  )
}
