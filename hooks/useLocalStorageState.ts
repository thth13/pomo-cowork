import { useEffect, useState } from 'react'

/**
 * Persist a React state value in localStorage.
 * Guarded for SSR – no localStorage access during server render.
 */
export function useLocalStorageState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue
    }

    try {
      const storedValue = window.localStorage.getItem(key)
      if (storedValue === null) {
        return defaultValue
      }

      return JSON.parse(storedValue) as T
    } catch (error) {
      console.warn(`useLocalStorageState: failed to parse value for ${key}`, error)
      return defaultValue
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn(`useLocalStorageState: failed to store value for ${key}`, error)
    }
  }, [key, value])

  return [value, setValue] as const
}
