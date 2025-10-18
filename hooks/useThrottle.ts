import { useCallback, useRef } from 'react'

/**
 * Returns a function that allows execution at most once per provided interval.
 */
export function useThrottle(delayMs: number) {
  const lastExecutionRef = useRef(0)

  return useCallback(() => {
    const now = Date.now()
    if (now - lastExecutionRef.current < delayMs) {
      return false
    }
    lastExecutionRef.current = now
    return true
  }, [delayMs])
}
