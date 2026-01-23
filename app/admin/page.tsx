'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'

const AdminReferralManager = dynamic(() => import('@/components/AdminReferralManager'), {
  ssr: false,
})

export default function AdminPage() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()

  useEffect(() => {
    // Only check if we aren't already authenticated and not currently loading
    if (!isAuthenticated && !isLoading) {
      checkAuth()
    }
  }, [isAuthenticated, isLoading, checkAuth])

  if (isLoading) {
    return null
  }

  if (!isAuthenticated) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">Admin</p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Referral links</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create, copy, and track referral URLs for campaigns and partners.
          </p>
        </div>
        <AdminReferralManager />
      </main>
    </div>
  )
}
