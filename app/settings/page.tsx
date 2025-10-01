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
        
        setSaveMessage('Настройки сохранены!')
        setTimeout(() => setSaveMessage(''), 3000)
      } else {
        setSaveMessage('Ошибка сохранения настроек')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveMessage('Ошибка сохранения настроек')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">
              Необходима авторизация
            </h1>
            <p className="text-slate-600">
              Войдите в аккаунт, чтобы изменить настройки.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
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
    <div className="min-h-screen">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center">
            <SettingsIcon className="w-8 h-8 mr-3" />
            Настройки
          </h1>
          <p className="text-slate-600">
            Настройте таймер и уведомления под себя
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
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Аккаунт
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Имя пользователя
                </label>
                <input
                  type="text"
                  value={user?.username || ''}
                  disabled
                  className="input bg-slate-50 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input bg-slate-50 cursor-not-allowed"
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
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Настройки таймера
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Продолжительность работы (минуты)
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Короткий перерыв (минуты)
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Длинный перерыв (минуты)
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Длинный перерыв после (сессий)
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
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
              <Volume2 className="w-5 h-5 mr-2" />
              Звуковые уведомления
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Включить звуки
                  </label>
                  <p className="text-sm text-slate-500">
                    Воспроизводить звук при завершении сессии
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              
              {settings.soundEnabled && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Громкость: {Math.round(settings.soundVolume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.soundVolume}
                    onChange={(e) => handleSettingChange('soundVolume', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
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
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Уведомления
            </h2>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Браузерные уведомления
                </label>
                <p className="text-sm text-slate-500">
                  Показывать уведомления в браузере при завершении сессии
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={(e) => handleSettingChange('notificationsEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
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
                    saveMessage.includes('Ошибка') ? 'text-red-600' : 'text-secondary-600'
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
                  <span>Сохранение...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Сохранить настройки</span>
                </>
              )}
            </motion.button>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
