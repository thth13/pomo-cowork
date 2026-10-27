'use client'

import { ArrowRight, BarChart3, CalendarCheck, Clock3, Crown, Heart, Image as ImageIcon, Loader2, Timer, Users } from 'lucide-react'
import { createPortal, flushSync } from 'react-dom'
import CommunityDialog from '@/components/CommunityDialog'
import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { initializePaddle, Paddle, CheckoutEventNames, Environments } from '@paddle/paddle-js'
import { useAuthStore } from '@/store/useAuthStore'
import AuthModal from '@/components/AuthModal'
import { useI18n } from '@/components/I18nProvider'

interface PaywallModalProps {
  onClose: () => void
  description?: string
}

export const PaywallModal = ({ onClose, description }: PaywallModalProps) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [paddle, setPaddle] = useState<Paddle | undefined>()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const planGroupId = useId()
  const [activationError, setActivationError] = useState<string | null>(null)
  const { isAuthenticated, token, checkAuth, user } = useAuthStore()
  const { t } = useI18n()
  const paywallTranslationsRef = useRef(t.paywall)
  paywallTranslationsRef.current = t.paywall

  const features = [
    { id: 'wallpapers', label: t.paywall.premiumWallpapers, icon: ImageIcon },
    { id: 'habits', label: t.paywall.unlimitedHabits, icon: CalendarCheck },
    { id: 'rooms', label: t.paywall.createPrivateRooms, icon: Users },
    { id: 'statistics', label: t.paywall.advancedStatistics, icon: BarChart3 },
    { id: 'time-entry', label: t.paywall.manualTimeEntry, icon: Clock3 },
    { id: 'tracker', label: t.paywall.timeTrackerMode, icon: Timer },
    { id: 'badge', label: t.paywall.proBadge, icon: Crown },
    { id: 'project', label: t.paywall.supportProject, icon: Heart },
  ]

  const activateTransaction = async (transactionId: string, authToken: string) => {
    const response = await fetch('/api/paddle/activate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ transactionId }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Activation failed' }))
      throw new Error(data.error ?? 'Activation failed')
    }

    await checkAuth()
  }

  useEffect(() => {
    const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
    if (!clientToken) {
      setActivationError(paywallTranslationsRef.current.checkoutUnavailable)
      return
    }
    initializePaddle({
      environment: (process.env.NEXT_PUBLIC_PADDLE_ENV as Environments) ?? 'sandbox',
      token: clientToken,
      eventCallback(event) {
        if (event.name === CheckoutEventNames.CHECKOUT_CLOSED) {
          setIsCheckoutOpen(false)
        }
        if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED) {
          const transactionId = (event.data as { transaction_id?: string } | undefined)?.transaction_id
          const authToken = useAuthStore.getState().token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
          if (transactionId && authToken) {
            setIsProcessing(true)
            setActivationError(null)
            activateTransaction(transactionId, authToken)
              .then(() => onClose())
              .catch(error => {
                console.error('Paddle activation error:', error)
                setActivationError(paywallTranslationsRef.current.activationPending)
              })
              .finally(() => setIsProcessing(false))
          } else {
            setActivationError(paywallTranslationsRef.current.activationMissing)
          }
        }
      },
    }).then(instance => {
      if (instance) setPaddle(instance)
      else setActivationError(paywallTranslationsRef.current.checkoutUnavailable)
    }).catch(() => {
      setActivationError(paywallTranslationsRef.current.checkoutUnavailable)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true)
      return
    }
    if (!paddle || isProcessing) return
    setIsProcessing(true)
    setActivationError(null)
    try {
      const authToken = token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
      const planId = selectedPlan === 'yearly' ? 'pro-yearly' : 'pro-monthly'
      const res = await fetch('/api/paddle/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (!res.ok || !data.transactionId) throw new Error(data.error ?? 'Checkout failed')
      // Release the native dialog's top layer before Paddle mounts its overlay.
      flushSync(() => setIsCheckoutOpen(true))
      paddle.Checkout.open({
        transactionId: data.transactionId,
        customer: user?.email ? { email: user.email } : undefined,
      })
    } catch (err) {
      console.error('Paddle checkout error:', err)
      setIsCheckoutOpen(false)
      setActivationError(t.paywall.checkoutError)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <CommunityDialog
        open={!isAuthModalOpen && !isCheckoutOpen}
        variant="upgrade-pro"
        title={t.paywall.title}
        description={description ?? t.paywall.subtitle}
        busy={isProcessing}
        dismissOnBackdrop
        onClose={onClose}
      >
        <div className="paywall-columns">
          <section className="paywall-features" aria-labelledby={`${planGroupId}-features`}>
            <div className="paywall-features-heading">
              <div>
                <h3 id={`${planGroupId}-features`}>{t.paywall.whatsIncluded}</h3>
                <p>{t.paywall.includedInBothPlans}</p>
              </div>
              <span className="paywall-features-badge" aria-hidden="true">PRO</span>
            </div>
            <ul>
              {features.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <span className="paywall-feature-icon" aria-hidden="true"><Icon size={17} strokeWidth={1.7} /></span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="paywall-purchase">
            <fieldset className="paywall-plans" disabled={isProcessing}>
              <legend>{t.paywall.choosePlan}</legend>
              {(['yearly', 'monthly'] as const).map(plan => (
                <label key={plan} className="paywall-plan">
                  <input
                    type="radio"
                    name={planGroupId}
                    value={plan}
                    checked={selectedPlan === plan}
                    onChange={() => setSelectedPlan(plan)}
                  />
                  <span className="paywall-plan-content">
                    <span className="paywall-plan-heading">
                      <span>{plan === 'yearly' ? t.paywall.yearlyPlan : t.paywall.monthlyPlan}</span>
                      {plan === 'yearly' && <span className="paywall-best-value">{t.paywall.bestValue}</span>}
                    </span>
                    <strong className="paywall-price">{plan === 'yearly' ? '$49.99' : '$4.99'}</strong>
                    <span className="paywall-billing">{plan === 'yearly' ? t.paywall.yearlyBilling : t.paywall.monthlyBilling}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={isProcessing || (isAuthenticated && !paddle)}
              aria-busy={isProcessing}
              className="community-button community-button-primary paywall-checkout"
            >
              {isProcessing ? <Loader2 size={16} className="paywall-spinner" aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
              <span>{isProcessing ? t.paywall.loading : t.paywall.checkout}</span>
            </button>

            {activationError && <p className="paywall-error" role="alert">{activationError}</p>}

            <p className="paywall-terms">
              {t.paywall.agreePrefix}{' '}
              <Link href="/terms">{t.paywall.terms}</Link>{' '}
              {t.paywall.and}{' '}
              <Link href="/privacy">{t.paywall.privacyPolicy}</Link>.
            </p>
          </div>
        </div>
      </CommunityDialog>

      {isAuthModalOpen && createPortal(
        <AuthModal isOpen onClose={() => setIsAuthModalOpen(false)} />,
        document.body,
      )}
    </>
  )
}
