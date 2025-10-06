'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/store/useThemeStore'

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme, setTheme } = useThemeStore()

  useEffect(() => {
    // Проверяем системную тему при первом запуске
    if (typeof window !== 'undefined') {
      // Инициализация темы при загрузке страницы
      const initTheme = () => {
        const savedTheme = localStorage.getItem('theme-storage')
        
        if (savedTheme) {
          try {
            const parsedTheme = JSON.parse(savedTheme)
            const themeValue = parsedTheme.state?.theme || 'light'
            document.documentElement.classList.remove('light', 'dark')
            document.documentElement.classList.add(themeValue)
          } catch (e) {
            console.error('Error parsing saved theme:', e)
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
              ? 'dark' 
              : 'light'
            setTheme(systemTheme)
          }
        } else {
          // Если нет сохранённой темы, используем системную
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
            ? 'dark' 
            : 'light'
          setTheme(systemTheme)
        }
      }

      initTheme()

      // Слушаем изменения системной темы
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => {
        const savedTheme = localStorage.getItem('theme-storage')
        // Обновляем тему только если пользователь не установил свою
        if (!savedTheme) {
          setTheme(e.matches ? 'dark' : 'light')
        }
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [setTheme])

  return <>{children}</>
}