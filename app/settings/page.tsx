'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Settings as SettingsIcon, 
  Clock, 
  Volume2, 
  Bell, 
  Save,
  User,
  Mail,
  Shield
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useTimerStore } from '@/store/useTimerStore'
import { UserSettings } from '@/types'
import Navbar from '@/components/Navbar'
import AvatarUploader from '@/components/AvatarUploader'
import { playEndSound, disposeNotificationSound } from '@/lib/notificationSound'

export default function SettingsPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const { setTimerSettings } = useTimerStore()
  
  const [settings, setSettings] = useState<UserSettings>({
    id: '',
    userId: '',
    workDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    longBreakAfter: 4,
    soundEnabled: true,
    soundVolume: 0.5,
    notificationsEnabled: true,
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [testMessage, setTestMessage] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const handleTestNotification = async () => {
    setTestMessage('')

    if (!settings.notificationsEnabled) {
      setTestMessage('Enable notifications toggle first')
      return
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      setTestMessage('Browser notifications are not supported here')
      return
    }

    let permission = Notification.permission

    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }

    if (permission !== 'granted') {
      setTestMessage('Allow notifications in your browser settings')
      return
    }

    try {
      new Notification('Test notification', {
        body: 'Browser notifications are working!',
        icon: '/icons/favicon-192.png',
        badge: '/icons/favicon-32.png',
      })
      setTestMessage('Notification sent')

      if (settings.soundEnabled) {
        await playEndSound(settings.soundVolume)
      }
    } catch (error) {
      console.error('Failed to send test notification:', error)
      setTestMessage('Failed to send notification')
    }

    setTimeout(() => setTestMessage(''), 5000)
  }

  useEffect(() => {
    if (isAuthenticated && user?.settings) {
      setSettings(user.settings)
      setTimerSettings({
        workDuration: user.settings.workDuration,
        shortBreak: user.settings.shortBreak,
        longBreak: user.settings.longBreak,
        longBreakAfter: user.settings.longBreakAfter,
      })
    }
    setIsLoading(false)
  }, [user, isAuthenticated, setTimerSettings])

  const handleSettingChange = (key: keyof UserSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
    setSaveMessage('')
    setTestMessage('')
  }

  const handleAvatarSelect = (file: File | null) => {
    setAvatarFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setAvatarPreview(null)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      const token = localStorage.getItem('token')
      
      // First, upload avatar if selected
      let newAvatarUrl = user?.avatarUrl
      if (avatarFile) {
        const formData = new FormData()
        formData.append('avatar', avatarFile)

        const uploadResponse = await fetch('/api/upload/avatar', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        })

        if (uploadResponse.ok) {
          const userData = await uploadResponse.json()
          newAvatarUrl = userData.avatarUrl
        } else {
          throw new Error('Failed to upload avatar')
        }
      }

      // Then save settings
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        // Update timer store with new settings
        setTimerSettings({
          workDuration: settings.workDuration,
          shortBreak: settings.shortBreak,
          longBreak: settings.longBreak,
          longBreakAfter: settings.longBreakAfter,
        })

        useAuthStore.setState((state) => {
          if (!state.user) {
            return state
          }

          return {
            ...state,
            user: {
              ...state.user,
              avatarUrl: newAvatarUrl,
              settings: {
                ...state.user.settings,
                ...settings
              }
            }
          }
        })
        
        // Clear temporary avatar data
        setAvatarFile(null)
        setAvatarPreview(null)
        
        // Редирект на главную
        router.push('/')
      } else {
        setSaveMessage('Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveMessage('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    return () => {
      disposeNotificationSound().catch((error) => {
        console.error('Failed to dispose audio context:', error)
      })
    }
  }, [])

  const focusMetrics = [
    { label: 'Work session', value: `${settings.workDuration} min`, Icon: Clock },
    { label: 'Short break', value: `${settings.shortBreak} min`, Icon: Bell },
    { label: 'Long break', value: `${settings.longBreak} min`, Icon: Shield },
  ]

  const timerControls = [
    {
      key: 'workDuration' as const,
      label: 'Work duration (minutes)',
      min: 1,
      max: 60,
      helper: 'Classic pomodoros are ~25 minutes — adjust to match your focus arc.',
    },
    {
      key: 'shortBreak' as const,
      label: 'Short break (minutes)',
      min: 1,
      max: 30,
      helper: 'Micro reset between focus sprints.',
    },
    {
      key: 'longBreak' as const,
      label: 'Long break (minutes)',
      min: 1,
      max: 60,
      helper: 'Give yourself enough time to recharge after several cycles.',
    },
    {
      key: 'longBreakAfter' as const,
      label: 'Long break after (sessions)',
      min: 2,
      max: 10,
      helper: 'Number of work sessions before you take the extended break.',
    },
  ]

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">
              Authorization Required
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Please log in to change your settings.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900">
      <Navbar />

      <main className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-x-4 top-24 h-64 rounded-[32px] bg-gradient-to-r from-primary-500/25 via-transparent to-secondary-500/25 blur-3xl dark:from-primary-400/20 dark:via-transparent dark:to-secondary-400/20" />

        <div className="relative space-y-10">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-white/90 to-slate-50 shadow-xl ring-1 ring-black/5 backdrop-blur dark:border-slate-700/70 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-950"
          >
            <div className="absolute -right-24 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-primary-500/25 blur-3xl transition-all duration-500 group-hover:opacity-90 dark:bg-primary-400/25" />
            <div className="absolute -left-28 -top-24 h-64 w-64 rounded-full bg-secondary-500/20 blur-3xl dark:bg-secondary-400/20" />

            <div className="relative flex flex-col gap-8 p-8 sm:p-10 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl space-y-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                  <SettingsIcon className="h-4 w-4 text-primary-500" />
                  Control center
                </span>
                <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">
                  Shape your ideal focus routine
                </h1>
                <p className="text-base text-slate-600 dark:text-slate-300">
                  Tune sessions, refine notifications, and keep every signal aligned with the way you work best.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                  <Shield className="h-4 w-4 text-primary-500" />
                  <span>Changes sync instantly across the workspace.</span>
                </div>
              </div>

              <div className="grid w-full gap-4 sm:grid-cols-3 md:max-w-md">
                {focusMetrics.map(({ label, value, Icon }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-900/80"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:bg-primary-400/10 dark:text-primary-300">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {label}
                        </p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">
                          {value}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.35 }}
            className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 shadow-xl ring-1 ring-black/5 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/80"
          >
            <div className="absolute inset-x-12 -top-24 h-48 rounded-full bg-primary-500/12 blur-3xl dark:bg-primary-400/12" />

            <div className="relative space-y-8 p-8">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                    Account
                  </span>
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                    Own your presence
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Refresh your avatar and keep your identity consistent across sessions.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-4 py-2 text-xs font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                  <User className="h-4 w-4 text-primary-500" />
                  {user?.username || 'Anonymous'}
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-[320px,1fr]">
                <AvatarUploader
                  currentAvatar={user?.avatarUrl}
                  onFileSelect={handleAvatarSelect}
                  previewUrl={avatarPreview}
                />

                <div className="flex flex-col gap-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:bg-primary-400/10 dark:text-primary-300">
                          <User className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Username
                          </p>
                          <p className="text-base font-semibold text-slate-900 dark:text-white">
                            {user?.username || 'Not set'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:bg-primary-400/10 dark:text-primary-300">
                          <Mail className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Email
                          </p>
                          <p className="text-base font-semibold text-slate-900 dark:text-white">
                            {user?.email || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-primary-200/60 bg-primary-50/70 p-5 text-sm text-slate-600 shadow-sm dark:border-primary-400/40 dark:bg-primary-900/30 dark:text-slate-200">
                    <Shield className="mt-1 h-5 w-5 text-primary-500 dark:text-primary-300" />
                    <p>
                      Username and email are verified through workspace admin. Ping the core team if you need to update them or switch to an anonymous profile.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.35 }}
            className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/80"
          >
            <div className="absolute inset-x-20 -top-28 h-40 rounded-full bg-secondary-500/12 blur-3xl dark:bg-secondary-400/12" />

            <div className="relative space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-500/15 text-secondary-600 dark:bg-secondary-400/10 dark:text-secondary-300">
                    <Clock className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                      Timer cadence
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Dial in how long you focus and when breaks land.
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-slate-200/70 bg-white/75 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                  Auto-sync enabled
                </span>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {timerControls.map(({ key, label, min, max, helper }) => (
                  <div key={key} className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {label}
                    </label>
                    <input
                      type="number"
                      min={min}
                      max={max}
                      value={settings[key]}
                      onChange={(e) => {
                        const value = Number(e.target.value)
                        const nextValue = Number.isNaN(value)
                          ? min
                          : Math.min(max, Math.max(min, value))
                        handleSettingChange(key, nextValue)
                      }}
                      className="w-full rounded-2xl border border-slate-300/80 bg-white/90 px-4 py-3 text-base font-medium text-slate-900 shadow-sm transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-900/70 dark:text-white dark:focus:border-primary-300 dark:focus:ring-primary-500/40"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {helper}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.35 }}
            className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/80"
          >
            <div className="absolute inset-x-16 -top-24 h-44 rounded-full bg-primary-500/10 blur-3xl dark:bg-primary-400/10" />

            <div className="relative grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:bg-primary-400/10 dark:text-primary-300">
                        <Volume2 className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                          Sound cues
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Audible signals when a session ends.
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Works even if the app tab is backgrounded.
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                      className="peer sr-only"
                      aria-label="Toggle sound notifications"
                    />
                    <div className="h-7 w-12 rounded-full bg-slate-200 transition peer-checked:bg-primary-500 dark:bg-slate-700 dark:peer-checked:bg-primary-500">
                      <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                    </div>
                  </label>
                </div>

                {settings.soundEnabled && (
                  <div className="mt-5 space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Volume — {Math.round(settings.soundVolume * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.soundVolume}
                      onChange={(e) => handleSettingChange('soundVolume', parseFloat(e.target.value))}
                      className="w-full accent-primary-500 transition focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:bg-primary-400/10 dark:text-primary-300">
                          <Bell className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                            Browser notifications
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Heads-up alerts when sessions flip.
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        We only ping you after you grant browser permissions.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notificationsEnabled}
                        onChange={(e) => handleSettingChange('notificationsEnabled', e.target.checked)}
                        className="peer sr-only"
                        aria-label="Toggle browser notifications"
                      />
                      <div className="h-7 w-12 rounded-full bg-slate-200 transition peer-checked:bg-primary-500 dark:bg-slate-700 dark:peer-checked:bg-primary-500">
                        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                      </div>
                    </label>
                  </div>

                  <motion.button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full bg-primary-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/70 disabled:cursor-not-allowed disabled:bg-primary-400/70"
                    onClick={handleTestNotification}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Test notification
                  </motion.button>

                  {testMessage && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      role="status"
                      className="text-sm text-slate-500 dark:text-slate-400"
                    >
                      {testMessage}
                    </motion.span>
                  )}
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.35 }}
            className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/80"
          >
            <div className="absolute inset-x-14 -top-24 h-44 rounded-full bg-secondary-500/10 blur-3xl dark:bg-secondary-400/10" />

            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Lock in your configuration
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Saving pushes the updates to any active sessions you have open.
                </p>

                {saveMessage && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    role="status"
                    className={`text-sm ${saveMessage.includes('Failed') ? 'text-red-600 dark:text-red-400' : 'text-primary-600 dark:text-primary-400'}`}
                  >
                    {saveMessage}
                  </motion.p>
                )}
              </div>

              <motion.button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/70 disabled:cursor-not-allowed disabled:bg-primary-400/70"
                whileHover={{ scale: isSaving ? 1 : 1.03 }}
                whileTap={{ scale: isSaving ? 1 : 0.97 }}
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save settings</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  )
}
