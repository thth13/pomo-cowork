import { useCallback, useEffect, useRef } from 'react'

interface UseAutoStartOptions {
  delay?: number
}

/**
 * Handles auto-start scheduling between Pomodoro sessions.
 */
export function useAutoStart(isEnabled: boolean, onStart?: () => void | Promise<void>, options: UseAutoStartOptions = {}) {
  const { delay = 1200 } = options
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clearAutoStart = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const scheduleAutoStart = useCallback(
    (callback?: () => void | Promise<void>) => {
      const startCallback = callback ?? onStart
      if (!startCallback || !isEnabled) {
        clearAutoStart()
        return
      }

      clearAutoStart()

      timeoutRef.current = setTimeout(() => {
        Promise.resolve(startCallback()).catch((error) => {
          console.error('useAutoStart: failed to auto-start session', error)
        })
      }, delay)
    },
    [clearAutoStart, delay, isEnabled, onStart]
  )

  useEffect(() => {
    if (!isEnabled) {
      clearAutoStart()
    }

    return () => {
      clearAutoStart()
    }
  }, [isEnabled, clearAutoStart])

  return { scheduleAutoStart, clearAutoStart }
}
