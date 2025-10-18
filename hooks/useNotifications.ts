import { useCallback } from 'react'
import { playStartSound, playEndSound } from '@/lib/notificationSound'

export function useNotifications(enabled: boolean, soundEnabled: boolean, volume: number) {
  const showNotification = useCallback(
    (title: string, body: string) => {
      if (!enabled || typeof window === 'undefined') {
        return
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: '/icons/favicon-192.png',
            badge: '/icons/favicon-32.png',
          })
        } catch (error) {
          console.error('Failed to show notification:', error)
        }
      }
    },
    [enabled]
  )

  const playSound = useCallback(
    (type: 'start' | 'end') => {
      if (!soundEnabled) {
        return
      }

      const play = type === 'start' ? playStartSound : playEndSound

      play(volume).catch((error) => {
        console.error(`Failed to play ${type} sound:`, error)
      })
    },
    [soundEnabled, volume]
  )

  return { showNotification, playSound }
}
