'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sun, Moon, Cloud, Star } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-16 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className={`relative flex w-16 h-8 rounded-full p-1 transition-all duration-500 outline-none ${
        isDark 
          ? 'bg-slate-800 ring-1 ring-inset ring-white/10 md:ring-0 shadow-[0_0_10px_rgba(0,0,0,0.4)] md:shadow-none' 
          : 'bg-sky-300'
      }`}
      aria-label="Toggle Theme"
      title={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
        {/* Stars */}
        <motion.div
          initial={false}
          animate={{
            y: isDark ? 0 : 20,
            opacity: isDark ? 1 : 0,
          }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {/* Several little realistic stars */}
          <div className="absolute top-[14px] left-[8px] w-[2px] h-[2px] rounded-full bg-white opacity-90 animate-pulse shadow-[0_0_3px_1px_rgba(255,255,255,0.8)]" />
          <div className="absolute top-[8px] left-[16px] w-[1px] h-[1px] rounded-full bg-white opacity-60 shadow-[0_0_2px_rgba(255,255,255,0.6)]" />
          <div className="absolute top-[20px] left-[14px] w-[2px] h-[2px] rounded-full bg-blue-100 opacity-80 animate-pulse shadow-[0_0_4px_rgba(219,234,254,0.8)]" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-[12px] left-[24px] w-[1.5px] h-[1.5px] rounded-full bg-white opacity-100 shadow-[0_0_2px_1px_rgba(255,255,255,0.9)]" />
          <div className="absolute top-[22px] left-[26px] w-[1px] h-[1px] rounded-full bg-white opacity-50 shadow-[0_0_2px_rgba(255,255,255,0.4)]" />
          <div className="absolute top-[16px] left-[32px] w-[2px] h-[2px] rounded-full bg-blue-50 opacity-90 animate-pulse shadow-[0_0_3px_rgba(239,246,255,0.8)]" style={{ animationDelay: '1s' }} />
        </motion.div>

        {/* Clouds */}
        <motion.div
          initial={false}
          animate={{
            y: isDark ? 20 : 0,
            opacity: isDark ? 0 : 1,
          }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <Cloud className="absolute top-[10px] right-[6px] w-4 h-4 text-white fill-white opacity-80 drop-shadow-sm" />
          <Cloud className="absolute top-[5px] right-[18px] w-3 h-3 text-white fill-white opacity-60" />
          <Cloud className="absolute top-[16px] right-[22px] w-[10px] h-[10px] text-white/90 fill-white opacity-50" />
        </motion.div>
      </div>

      {/* Toggle Handle */}
      <motion.div
        className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm"
        initial={false}
        animate={{
          x: isDark ? 32 : 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <motion.div
          initial={false}
          animate={{
            rotate: isDark ? -180 : 0,
            opacity: isDark ? 0 : 1,
          }}
          transition={{ duration: 0.3 }}
          className="absolute"
        >
          <Sun className="h-4 w-4 text-amber-500" />
        </motion.div>
        
        <motion.div
          initial={false}
          animate={{
            rotate: isDark ? 0 : 180,
            opacity: isDark ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
          className="absolute"
        >
          <Moon className="h-4 w-4 text-slate-700" />
        </motion.div>
      </motion.div>
    </button>
  )
}