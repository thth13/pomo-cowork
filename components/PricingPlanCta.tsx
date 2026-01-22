'use client'

import Link from 'next/link'
import { useState } from 'react'
import AuthModal from '@/components/AuthModal'
import { useAuthStore } from '@/store/useAuthStore'

interface PricingPlanCtaProps {
  planId: 'free' | 'pro-yearly' | 'pro-monthly'
  ctaLabel: string
  ctaHref: string
  highlighted?: boolean
}

export default function PricingPlanCta({ planId, ctaLabel, ctaHref, highlighted }: PricingPlanCtaProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const isProMember = Boolean(user?.isPro)
  const proExpiresAt = user?.proExpiresAt ? new Date(user.proExpiresAt) : null
  const proExpiryLabel = proExpiresAt
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(proExpiresAt)
    : null

  if (planId === 'free') {
    return (
      <div className="mb-5 inline-flex w-full items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-200">
        {isProMember ? 'Included with Pro' : 'Your plan'}
      </div>
    )
  }

  if (isProMember) {
    return (
      <div className="mb-5 flex w-full flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center text-sm font-semibold text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-200">
        <span>Subscription active</span>
        <span className="mt-1 text-xs font-medium text-emerald-700/80 dark:text-emerald-200/80">
          {proExpiryLabel ? `Active until ${proExpiryLabel}` : 'Active (no expiry date set)'}
        </span>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <Link
        href={ctaHref}
        className={`mb-5 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
          highlighted
            ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-lg shadow-red-500/20 hover:from-red-600 hover:to-amber-600'
            : 'border border-slate-200 text-slate-800 hover:border-amber-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:border-amber-600'
        }`}
      >
        {ctaLabel}
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        disabled={isLoading}
        onClick={() => setIsAuthModalOpen(true)}
        className={`mb-5 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
          highlighted
            ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-lg shadow-red-500/20 hover:from-red-600 hover:to-amber-600'
            : 'border border-slate-200 text-slate-800 hover:border-amber-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:border-amber-600'
        } ${isLoading ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        Sign in to purchase
      </button>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  )
}
