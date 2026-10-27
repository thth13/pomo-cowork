'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Clock, 
  Volume2, 
  Bell, 
  Save,
  CreditCard,
  User,
  Shield
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useTimerStore } from '@/store/useTimerStore'
import { UserSettings } from '@/types'
import Navbar from '@/components/Navbar'
import PersonalNavigation from '@/components/PersonalNavigation'
import CommunityDialog from '@/components/CommunityDialog'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import './settings.css'
import AvatarUploader from '@/components/AvatarUploader'
import { useI18n } from '@/components/I18nProvider'
import AuthModal from '@/components/AuthModal'
import { PaywallModal } from '@/components/PaywallModal'
import { playEndSound, disposeNotificationSound } from '@/lib/notificationSound'

export default function SettingsPage() {
  const router = useRouter()
  const { t } = useI18n()
  const profileCopy = t.settingsProfile
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore()
  const { setTimerSettings } = useTimerStore()

  interface SubscriptionDetail {
    label: string
    value: string
    helper?: string
  }
  
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

  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    description: ''
  })
  
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [testMessage, setTestMessage] = useState('')
  const [subscriptionMessage, setSubscriptionMessage] = useState('')
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const avatarReadVersion = useRef(0)

  const isProMember = Boolean(user?.isPro && (!user?.proExpiresAt || new Date(user.proExpiresAt) > new Date()))
  const hasScheduledCancellation = Boolean(
    user?.paddleCancelAt && new Date(user.paddleCancelAt) > new Date()
  )
  const shouldPromptRegister = !isAuthenticated || user?.isAnonymous

  const openPaywallOrRegister = () => {
    if (shouldPromptRegister) {
      setIsAuthModalOpen(true)
      return
    }

    setShowPaywall(true)
  }
  
  const formatProExpiryDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const handleCancelSubscription = async () => {
    setSubscriptionMessage('')
    setIsCancellingSubscription(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/paddle/cancel', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setSubscriptionMessage(data.error || 'Failed to cancel subscription')
        return
      }

      useAuthStore.setState((state) => {
        if (!state.user) {
          return state
        }

        return {
          ...state,
          user: {
            ...state.user,
            paddleSubscriptionId: data.paddleSubscriptionId ?? state.user.paddleSubscriptionId ?? null,
            paddleCancelAt: data.paddleCancelAt ?? state.user.paddleCancelAt ?? null,
          },
        }
      })

      setSubscriptionMessage(
        data.paddleCancelAt
          ? `Subscription will end on ${formatProExpiryDate(data.paddleCancelAt)}.`
          : 'Subscription cancellation scheduled.'
      )
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
      setSubscriptionMessage('Failed to cancel subscription')
    } finally {
      setIsCancellingSubscription(false)
    }
  }

  const subscriptionDetails: SubscriptionDetail[] = [
    {
      label: 'Plan',
      value: isProMember ? 'Pro' : 'Free',
      helper: isProMember ? 'Unlimited focus rooms and analytics.' : 'Upgrade to unlock Pro perks.',
    },
    {
      label: 'Status',
      value: isProMember ? 'Active' : 'Inactive',
      helper: isProMember ? 'Your subscription is currently active.' : 'No active subscription found.',
    },
    ...(isProMember
      ? [
          {
            label: hasScheduledCancellation ? 'Access until' : 'Next payment',
            value: user?.proExpiresAt ? formatProExpiryDate(user.proExpiresAt) : '—',
            helper: user?.proExpiresAt
              ? hasScheduledCancellation
                ? 'Your Pro access remains active until this date.'
                : 'Your next Pro payment is scheduled for this date.'
              : hasScheduledCancellation
                ? 'Access end date not available.'
                : 'Next payment date not available.',
          },
        ]
      : []),
    ...(hasScheduledCancellation
      ? [
          {
            label: 'Renewal',
            value: 'Canceled',
            helper: user?.paddleCancelAt
              ? `Your subscription will stay active until ${formatProExpiryDate(user.paddleCancelAt)}.`
              : 'Your subscription will not renew.',
          },
        ]
      : []),
  ]

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
      setProfileData({
        username: user.username || '',
        email: user.email || '',
        description: user.description || ''
      })
    }
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
    const version = ++avatarReadVersion.current
    setAvatarRemoved(!file)
    setSaveMessage('')
    setAvatarFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (version === avatarReadVersion.current) setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setAvatarPreview(null)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage('')
    
    try {
      const token = localStorage.getItem('token')
      
      // First, upload avatar if selected
      let newAvatarUrl = avatarRemoved ? undefined : user?.avatarUrl
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

      // Then save settings and profile data
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...settings,
          username: profileData.username,
          email: profileData.email,
          description: profileData.description,
          removeAvatar: avatarRemoved,
        })
      })

      if (response.ok) {
        const updatedUser = await response.json()
        
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
              ...updatedUser,
              avatarUrl: newAvatarUrl,
            }
          }
        })
        
        // Clear temporary avatar data
        setAvatarFile(null)
        setAvatarPreview(null)
        setAvatarRemoved(false)
        
        // Мгновенный редирект на страницу профиля
        router.push('/')
      } else {
        const error = await response.json()
        setSaveMessage(error.error || 'Failed to save settings')
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

  if (authLoading) {
    return (
      <div className="garden-page settings-page">
        <Navbar compact />
        <main className="settings-content personal-page-frame">
          <PersonalNavigation />
          <div className="flex min-h-64 items-center justify-center" role="status" aria-label="Loading settings">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        </main>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="garden-page settings-page">
        <Navbar compact />
        <main className="settings-content personal-page-frame">
          <PersonalNavigation />
          <div className="settings-panel text-center">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">
              Authorization Required
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Please log in to change your settings.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="garden-page settings-page">
      <Navbar compact />

      <main className="settings-content personal-page-frame">
        <PersonalNavigation />
        <div className="settings-sections">
          <section className="settings-panel settings-profile" aria-labelledby="settings-profile-title" data-i18n-ignore>
            <header className="settings-profile-header">
              <div>
                <p className="settings-profile-eyebrow">{profileCopy.account}</p>
                <h2 id="settings-profile-title" className="font-semibold">{profileCopy.title}</h2>
                <p className="settings-profile-subtitle">{profileCopy.subtitle}</p>
              </div>
              <span className="settings-profile-account"><User size={15} aria-hidden="true" />{user?.username || 'Anonymous'}</span>
            </header>
            <div className="settings-profile-layout">
              <AvatarUploader
                currentAvatar={avatarRemoved ? undefined : user?.avatarUrl}
                onFileSelect={handleAvatarSelect}
                previewUrl={avatarPreview}
                removed={avatarRemoved}
                disabled={isSaving}
                onUndoRemove={() => setAvatarRemoved(false)}
              />
              <div className="settings-profile-fields">
                <div className="space-y-2">
                  <label htmlFor="settings-username" className="settings-profile-label">{profileCopy.username}</label>
                  <input
                    id="settings-username"
                    type="text"
                    autoComplete="username"
                    value={profileData.username}
                    onChange={(event) => {
                      setProfileData(prev => ({ ...prev, username: event.target.value }))
                      setSaveMessage('')
                    }}
                    className="settings-input"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="settings-email" className="settings-profile-label">{profileCopy.email}</label>
                  <input
                    id="settings-email"
                    type="email"
                    autoComplete="email"
                    value={profileData.email}
                    onChange={(event) => {
                      setProfileData(prev => ({ ...prev, email: event.target.value }))
                      setSaveMessage('')
                    }}
                    className="settings-input"
                  />
                </div>
                <div className="settings-profile-bio space-y-2">
                  <label htmlFor="settings-description" className="settings-profile-label">{profileCopy.bio}</label>
                  <textarea
                    id="settings-description"
                    value={profileData.description}
                    onChange={(event) => {
                      setProfileData(prev => ({ ...prev, description: event.target.value }))
                      setSaveMessage('')
                    }}
                    rows={3}
                    className="settings-input settings-description resize-none"
                    placeholder={profileCopy.bioPlaceholder}
                    aria-describedby="settings-profile-visibility"
                  />
                </div>
                <div id="settings-profile-visibility" className="settings-profile-visibility">
                  <Shield size={20} aria-hidden="true" />
                  <p>{profileCopy.visibility}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="settings-panel">
            <div className="relative space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <span className="settings-section-icon">
                    <Clock className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                      Timer
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Set your work and break durations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {timerControls.map(({ key, label, min, max, helper }) => (
                  <div key={key} className="space-y-2">
                    <label htmlFor={`settings-${key}`} className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {label}
                    </label>
                    <input
                      id={`settings-${key}`}
                      aria-describedby={`settings-${key}-help`}
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
                      className="settings-input"
                    />
                    <p id={`settings-${key}-help`} className="text-xs text-slate-500 dark:text-slate-400">
                      {helper}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="settings-panel">
            <div className="relative grid gap-6 md:grid-cols-2">
              <div className="settings-inset p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="settings-section-icon">
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

                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                      className="settings-checkbox"
                      aria-label="Toggle sound notifications"
                    />
                  </label>
                </div>

                {settings.soundEnabled && (
                  <div className="mt-5 space-y-2">
                    <label htmlFor="settings-volume" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Volume — {Math.round(settings.soundVolume * 100)}%
                    </label>
                    <input
                      id="settings-volume"
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.soundVolume}
                      onChange={(e) => handleSettingChange('soundVolume', parseFloat(e.target.value))}
                      className="settings-volume"
                    />
                  </div>
                )}
              </div>

              <div className="settings-inset p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="settings-section-icon">
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
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        checked={settings.notificationsEnabled}
                        onChange={(e) => handleSettingChange('notificationsEnabled', e.target.checked)}
                        className="settings-checkbox"
                        aria-label="Toggle browser notifications"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    className="settings-button settings-button-primary"
                    onClick={handleTestNotification}
                  >
                    Test notification
                  </button>

                  {testMessage && (
                    <span
                      role="status"
                      className="text-sm text-slate-500 dark:text-slate-400"
                    >
                      {testMessage}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="settings-panel">
            <div className="relative space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <span className="settings-section-icon">
                    <CreditCard className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                      Manage subscription
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Review plan status and update billing details.
                    </p>
                  </div>
                </div>

                {isProMember ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={isCancellingSubscription || hasScheduledCancellation}
                      className="settings-button"
                    >
                      {hasScheduledCancellation
                        ? 'Cancellation scheduled'
                        : isCancellingSubscription
                          ? 'Cancelling…'
                          : 'Cancel subscription'}
                    </button>
                  </div>
                ) : !isProMember ? (
                  <button
                    type="button"
                    onClick={openPaywallOrRegister}
                    className="settings-button settings-button-primary"
                  >
                    Get Pro
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="settings-button"
                    aria-disabled="true"
                  >
                    Manage subscription
                  </button>
                )}
              </div>

              {subscriptionMessage && (
                <p
                  role="status"
                  className={`text-sm ${subscriptionMessage.includes('Failed') ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  {subscriptionMessage}
                </p>
              )}

              <div className={`grid gap-4 ${subscriptionDetails.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                {subscriptionDetails.map(({ label, value, helper }) => (
                  <div
                    key={label}
                    className="settings-inset p-5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {label}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                      {value}
                    </p>
                    {helper && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {helper}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="settings-panel">
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Save changes
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Save your profile and focus preferences.
                </p>

                {saveMessage && (
                  <p
                    role="status"
                    className={`text-sm ${saveMessage.includes('Failed') ? 'text-red-600 dark:text-red-400' : 'text-primary-600 dark:text-primary-400'}`}
                  >
                    {saveMessage}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="settings-button settings-button-primary"
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
              </button>
            </div>
          </section>
        </div>
        <footer className="settings-language" data-i18n-ignore>
          <LanguageSwitcher variant="settings" />
        </footer>
      </main>
      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode="register" />

      <CommunityDialog
        open={showCancelConfirm}
        title="Cancel your subscription?"
        busy={isCancellingSubscription}
        onClose={() => setShowCancelConfirm(false)}
      >
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Your Pro access will remain active until{' '}
          <span className="font-semibold text-slate-900 dark:text-white">
            {user?.proExpiresAt
              ? formatProExpiryDate(user.proExpiresAt)
              : 'the end of your current billing period'}
          </span>
          . After that you will be switched to the free plan. This action cannot be undone.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setShowCancelConfirm(false)}
            className="settings-button"
          >
            Keep Pro
          </button>
          <button
            type="button"
            disabled={isCancellingSubscription}
            onClick={async () => {
              setShowCancelConfirm(false)
              await handleCancelSubscription()
            }}
            className="settings-button settings-button-danger"
          >
            {isCancellingSubscription ? 'Cancelling…' : 'Yes, cancel subscription'}
          </button>
        </div>
      </CommunityDialog>
    </div>
  )
}
