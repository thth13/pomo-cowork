'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = theme === 'dark'

  const buttonClasses = [
    'relative w-10 h-10 rounded-xl border overflow-hidden transition-all duration-300 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    isDark
      ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-[0_0_12px_rgba(56,189,248,0.35)] focus-visible:ring-slate-500 focus-visible:ring-offset-slate-900'
      : 'bg-gradient-to-br from-amber-100 via-orange-100 to-amber-200 border-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.35)] focus-visible:ring-amber-400 focus-visible:ring-offset-amber-50'
  ].join(' ')

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
    )
  }

  return (
    <motion.button
      onClick={toggleTheme}
      className={buttonClasses}
      whileHover={{ scale: 1.07 }}
      whileTap={{ scale: 0.94 }}
      title={theme === 'light' ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'}
    >
      <motion.span
        layout
        className="absolute inset-0 rounded-full"
        animate={{
          background: isDark
            ? 'radial-gradient(circle at 30% 30%, rgba(56,189,248,0.35), transparent 60%)'
            : 'radial-gradient(circle at 70% 30%, rgba(251,191,36,0.45), transparent 65%)',
          opacity: 1
        }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
      />

      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="moon-icon"
            initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.6, opacity: 0, rotate: 10 }}
            transition={{ duration: 0.2 }}
            className="relative flex items-center justify-center"
          >
            <motion.span
              className="absolute inset-0 rounded-full bg-cyan-400/25 blur-md"
              animate={{ opacity: [0.3, 0.55, 0.3], scale: [0.9, 1.05, 0.9] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <Moon className="relative w-5 h-5 text-cyan-100" strokeWidth={1.5} />
          </motion.div>
        ) : (
          <motion.div
            key="sun-icon"
            initial={{ scale: 0.6, opacity: 0, rotate: 10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.6, opacity: 0, rotate: -10 }}
            transition={{ duration: 0.2 }}
            className="relative flex items-center justify-center"
          >
            <motion.span
              className="absolute inset-0 rounded-full bg-amber-300/40 blur-md"
              animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.95, 1.08, 0.95] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <Sun className="relative w-5 h-5 text-amber-500" strokeWidth={1.8} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}