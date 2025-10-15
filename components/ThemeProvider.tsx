'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/store/useThemeStore'

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme } = useThemeStore()

  useEffect(() => {
    // Применяем тему при монтировании и изменении
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
  }, [theme])

  return <>{children}</>
}