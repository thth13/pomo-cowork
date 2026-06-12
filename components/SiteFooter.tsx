'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'

export default function SiteFooter() {
  const pathname = usePathname()
  const { isAuthenticated, isLoading } = useAuthStore()

  // On admin pages: hide footer if loading or unauthorized to match page behavior
  // This prevents footer flashing or showing up on "404" admin states
  const isAdmin = pathname?.startsWith('/admin')
  
  if (isAdmin && (isLoading || !isAuthenticated)) {
    return null
  }

  return (
    <footer className="border-t border-gray-200 bg-white/80 px-4 py-6 text-xs text-gray-500 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-3">
        <span>© 2026 Pomo Cowork</span>
        <span className="text-gray-300 dark:text-slate-600">•</span>
        <Link href="/terms" className="transition-colors hover:text-gray-800 dark:hover:text-slate-200">
          Terms of service
        </Link>
        <span className="text-gray-300 dark:text-slate-600">•</span>
        <Link href="/privacy" className="transition-colors hover:text-gray-800 dark:hover:text-slate-200">
          Privacy policy
        </Link>
      </div>
    </footer>
  )
}
