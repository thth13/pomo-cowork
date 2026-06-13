'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Crown, Gift, X } from 'lucide-react'
import AuthModal from '@/components/AuthModal'
import { useAuthStore } from '@/store/useAuthStore'
import { useI18n } from '@/components/I18nProvider'

const DISMISSED_KEY = 'pomo:free-premium-promo-2026:dismissed'

export default function PremiumPromoModal() {
  const { isAuthenticated, isLoading, token, checkAuth } = useAuthStore()
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimSucceeded, setClaimSucceeded] = useState(false)
  const [showFeatures, setShowFeatures] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isLoading || localStorage.getItem(DISMISSED_KEY) === 'true') return
    const timeout = window.setTimeout(() => setIsOpen(true), 700)
    return () => window.clearTimeout(timeout)
  }, [isLoading])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isAuthOpen) closeModal()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAuthOpen, isOpen])

  const closeModal = () => {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setIsOpen(false)
  }

  const claimPremium = async () => {
    if (!isAuthenticated) {
      setIsAuthOpen(true)
      return
    }

    const authToken = token ?? localStorage.getItem('token')
    if (!authToken || isClaiming) return

    setIsClaiming(true)
    setError('')

    try {
      const response = await fetch('/api/promotions/free-premium', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const data = await response.json() as { status?: string; error?: string }

      if (!response.ok) throw new Error(data.error ?? 'Failed to claim promotion')

      setClaimSucceeded(true)
      await checkAuth()
    } catch {
      setError(t.premiumPromo.claimError)
    } finally {
      setIsClaiming(false)
    }
  }

  const hasClaimed = claimSucceeded
  const premiumFeatures = [
    t.paywall.createPrivateRooms,
    t.paywall.advancedStatistics,
    t.paywall.manualTimeEntry,
    t.paywall.proBadge,
    t.paywall.timeTrackerMode,
  ]

  return (
    <>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            className="fixed bottom-4 left-4 z-40 w-[calc(100%-2rem)] max-w-sm sm:bottom-6 sm:left-6"
            initial={{ opacity: 0, y: 24, x: -12 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 16, x: -12 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            <motion.div
              role="status"
              aria-live="polite"
              aria-labelledby="premium-promo-title"
              className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-950/10"
            >
              <button
                type="button"
                onClick={closeModal}
                aria-label={t.common.close}
                className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="p-4">
                <div className="flex items-start gap-3 pr-7">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                    {hasClaimed ? <Check className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <h2 id="premium-promo-title" className="pt-1 text-base font-semibold leading-snug text-slate-900">
                      {hasClaimed ? t.premiumPromo.successTitle : t.premiumPromo.title}
                    </h2>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-5 text-slate-600">
                  {hasClaimed
                    ? t.premiumPromo.successDescription
                    : isAuthenticated
                      ? t.premiumPromo.memberDescription
                      : t.premiumPromo.guestDescription}
                </p>

                {!hasClaimed ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowFeatures((current) => !current)}
                      aria-expanded={showFeatures}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900"
                    >
                      {t.premiumPromo.proFeatures}
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${showFeatures ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {showFeatures ? (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="mt-2 space-y-2 overflow-hidden border-l border-slate-200 pl-3"
                        >
                          {premiumFeatures.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-xs text-slate-700">
                              <Check className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                              {feature}
                            </li>
                          ))}
                        </motion.ul>
                      ) : null}
                    </AnimatePresence>
                  </div>
                ) : null}

                {error ? (
                  <p className="mt-3 text-xs font-medium text-red-600">{error}</p>
                ) : null}

                <button
                  type="button"
                  onClick={hasClaimed ? closeModal : claimPremium}
                  disabled={isClaiming}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Crown className="h-4 w-4" />
                  {hasClaimed
                    ? t.premiumPromo.done
                    : isClaiming
                      ? t.premiumPromo.claiming
                      : isAuthenticated
                        ? t.premiumPromo.claim
                        : t.premiumPromo.register}
                </button>

                {!hasClaimed ? (
                  <p className="mt-2 text-center text-[11px] text-slate-500">
                    {t.premiumPromo.noCard}
                  </p>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode="register"
      />
    </>
  )
}
