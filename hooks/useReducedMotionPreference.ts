'use client'

import { useEffect, useState } from 'react'

export function useReducedMotionPreference() {
  // Do not start decorative video until the browser preference is known.
  const [reducedMotion, setReducedMotion] = useState(true)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reducedMotion
}
