import { useEffect, useState } from 'react'

/**
 * Acquire and release the Wake Lock API based on the provided flag.
 * Returns the active wake lock sentinel (if any) for debugging/inspection.
 */
export function useWakeLock(isActive: boolean) {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)

  useEffect(() => {
    let lock: WakeLockSentinel | null = null

    const handleRelease = () => {
      console.log('Wake Lock was released by browser')
      lock?.removeEventListener('release', handleRelease)
      lock = null
      setWakeLock(null)
    }

    const requestWakeLock = async () => {
      if (!isActive || typeof navigator === 'undefined' || !navigator.wakeLock) {
        return
      }

      try {
        lock = await navigator.wakeLock.request('screen')
        lock.addEventListener('release', handleRelease)
        setWakeLock(lock)
        console.log('Wake Lock acquired')
      } catch (error) {
        console.error('Wake Lock error:', error)
      }
    }

    const releaseWakeLock = async () => {
      if (!lock) {
        return
      }

      try {
        if (!lock.released) {
          await lock.release()
        }
        console.log('Wake Lock released')
      } catch (error) {
        console.error('Wake Lock release error:', error)
      } finally {
        if (lock) {
          lock.removeEventListener('release', handleRelease)
          lock = null
        }
        setWakeLock(null)
      }
    }

    if (isActive) {
      requestWakeLock()
    }

    return () => {
      releaseWakeLock()
    }
  }, [isActive])

  return wakeLock
}
