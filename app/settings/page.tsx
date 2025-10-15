'use client'

import { useState, useEffect } from 'react'
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
import { playEndSound, disposeNotificationSound } from '@/lib/notificationSound'

export default function SettingsPage() {
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

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      const token = localStorage.getItem('token')
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
              settings: {
                ...state.user.settings,
                ...settings
              }
            }
          }
        })
        
        setSaveMessage('Settings saved!')
        setTimeout(() => setSaveMessage(''), 3000)
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 flex items-center">
            <SettingsIcon className="w-8 h-8 mr-3" />
            Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Customize your timer and notifications
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Account Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Account
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={user?.username || ''}
                  disabled
                  className="input bg-slate-50 dark:bg-slate-700 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input bg-slate-50 dark:bg-slate-700 cursor-not-allowed"
                />
              </div>
            </div>
          </motion.div>

          {/* Timer Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Timer Settings
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Work duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.workDuration}
                  onChange={(e) => handleSettingChange('workDuration', parseInt(e.target.value))}
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Short break (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.shortBreak}
                  onChange={(e) => handleSettingChange('shortBreak', parseInt(e.target.value))}
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Long break (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.longBreak}
                  onChange={(e) => handleSettingChange('longBreak', parseInt(e.target.value))}
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Long break after (sessions)
                </label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={settings.longBreakAfter}
                  onChange={(e) => handleSettingChange('longBreakAfter', parseInt(e.target.value))}
                  className="input"
                />
              </div>
            </div>
          </motion.div>

          {/* Sound Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center">
              <Volume2 className="w-5 h-5 mr-2" />
              Sound Notifications
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Enable sounds
                  </label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Play sound when session completes
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              
              {settings.soundEnabled && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Volume: {Math.round(settings.soundVolume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.soundVolume}
                    onChange={(e) => handleSettingChange('soundVolume', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
              )}
            </div>
          </motion.div>

          {/* Notification Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card"
          >
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notifications
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Browser notifications
                  </label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Show browser notifications when session completes
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notificationsEnabled}
                    onChange={(e) => handleSettingChange('notificationsEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <motion.button
                  type="button"
                  className="btn-secondary px-5 py-2"
                  onClick={handleTestNotification}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Test notification
                </motion.button>

                {testMessage && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {testMessage}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
          

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-between"
          >
            <div>
              {saveMessage && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-sm ${
                    saveMessage.includes('Ошибка') ? 'text-red-600 dark:text-red-400' : 'text-secondary-600 dark:text-secondary-400'
                  }`}
                >
                  {saveMessage}
                </motion.p>
              )}
            </div>
            
            <motion.button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary flex items-center space-x-2 px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: isSaving ? 1 : 1.05 }}
              whileTap={{ scale: isSaving ? 1 : 0.95 }}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Settings</span>
                </>
              )}
            </motion.button>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
