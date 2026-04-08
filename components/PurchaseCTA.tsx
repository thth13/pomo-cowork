'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { initializePaddle, Paddle, CheckoutEventNames, Environments } from '@paddle/paddle-js'
import AuthModal from '@/components/AuthModal'
import { useAuthStore } from '@/store/useAuthStore'

interface PurchaseCTAProps {
  priceLabel: string
  planName?: string
  planId?: 'pro-yearly' | 'pro-monthly'
}

export default function PurchaseCTA({ priceLabel, planName, planId }: PurchaseCTAProps) {
  const { isAuthenticated, isLoading, token, checkAuth, user } = useAuthStore()
  const router = useRouter()
  const [paddle, setPaddle] = useState<Paddle | undefined>()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [checkoutDone, setCheckoutDone] = useState(false)
  const [activationError, setActivationError] = useState<string | null>(null)
  const [vladikStep, setVladikStep] = useState<'question' | 'checking' | 'congrats'>('question')
  const vladikTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isVladik = user?.id === 'cmg93grnk00009cz1m82i3091'

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
    if (!clientToken) return
    initializePaddle({
      environment: (process.env.NEXT_PUBLIC_PADDLE_ENV as Environments) ?? 'sandbox',
      token: clientToken,
      eventCallback(event) {
        if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED) {
          setCheckoutDone(true)
          setActivationError(null)
          const transactionId = (event.data as { transaction_id?: string } | undefined)?.transaction_id
          const authToken = useAuthStore.getState().token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
          if (transactionId && authToken) {
            activateTransaction(transactionId, authToken)
              .then(() => router.push('/'))
              .catch(error => {
                console.error('Paddle activation error:', error)
                setCheckoutDone(false)
                setActivationError('Payment succeeded, but Pro activation is still processing. Refresh the page in a few seconds.')
              })
          } else {
            setCheckoutDone(false)
            setActivationError('Payment succeeded, but transaction verification data is missing.')
          }
        }
      },
    }).then(instance => {
      if (instance) setPaddle(instance)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const clearVladikTimer = () => {
    if (vladikTimerRef.current) {
      clearTimeout(vladikTimerRef.current)
      vladikTimerRef.current = null
    }
  }

  const handleVladikYes = () => {
    clearVladikTimer()
    setVladikStep('checking')
    vladikTimerRef.current = setTimeout(() => {
      setVladikStep('congrats')
      vladikTimerRef.current = null
    }, 3000)
  }

  // Only used for the Vladik free-grant path
  const handleVladikContinue = async () => {
    try {
      setIsProcessing(true)
      const authToken = token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authToken) headers.Authorization = `Bearer ${authToken}`
      await fetch('/api/purchase', { method: 'POST', headers, body: JSON.stringify({ planId }) })
      await checkAuth()
      router.push('/')
    } finally {
      setIsProcessing(false)
      setIsPurchaseModalOpen(false)
    }
  }

  const handlePurchase = async () => {
    if (!paddle || isProcessing) return
    setIsProcessing(true)
    setActivationError(null)
    try {
      const authToken = token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
      const res = await fetch('/api/paddle/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ planId: planId ?? 'pro-yearly' }),
      })
      const data = await res.json()
      if (!res.ok || !data.transactionId) throw new Error(data.error ?? 'Checkout failed')
      paddle.Checkout.open({
        transactionId: data.transactionId,
        customer: user?.email ? { email: user.email } : undefined,
      })
    } catch (err) {
      console.error('Paddle checkout error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      {checkoutDone ? (
        <div className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          Payment received — activating Pro…
        </div>
      ) : isAuthenticated ? (
        <div className="space-y-2">
          <button
            type="button"
            disabled={isProcessing || !paddle}
            onClick={() => {
              if (isVladik) {
                clearVladikTimer()
                setVladikStep('question')
                setIsPurchaseModalOpen(true)
              } else {
                handlePurchase()
              }
            }}
            className={`inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:from-red-600 hover:to-amber-600 ${
              isProcessing || !paddle ? 'cursor-not-allowed opacity-70' : ''
            }`}
          >
            {isProcessing ? 'Loading…' : `Purchase for ${priceLabel}`}
          </button>
          {activationError ? (
            <p className="text-xs text-center text-red-600 dark:text-red-400">
              {activationError}
            </p>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={isLoading}
          onClick={() => setIsAuthModalOpen(true)}
          className={`inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-all hover:border-amber-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:border-amber-600 ${
            isLoading ? 'cursor-not-allowed opacity-60' : ''
          }`}
        >
          Sign in to purchase
        </button>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {isPurchaseModalOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-6 left-4 h-16 w-14 rounded-full bg-gradient-to-br from-rose-400/70 to-amber-300/70" />
              <div className="absolute -top-4 right-6 h-14 w-12 rounded-full bg-gradient-to-br from-emerald-400/70 to-lime-300/70" />
              <div className="absolute -bottom-6 left-10 h-16 w-14 rounded-full bg-gradient-to-br from-sky-400/70 to-indigo-400/70" />
            </div>

            <div className="relative">
              {isVladik ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                      Проверка на Владиковость
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        clearVladikTimer()
                        setIsPurchaseModalOpen(false)
                      }}
                      className="rounded-lg px-2 py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      ✕
                    </button>
                  </div>

                  {vladikStep === 'question' ? (
                    <>
                      <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
                        Являетесь вы Влатиком?
                      </h3>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        Необходимо пройти проверку на Влатиковость.
                      </p>

                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={handleVladikYes}
                          className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:from-red-600 hover:to-amber-600"
                        >
                          Да
                        </button>
                        <button
                          type="button"
                          onClick={handleVladikYes}
                          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-amber-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-amber-600"
                        >
                          Да
                        </button>
                      </div>
                    </>
                  ) : vladikStep === 'checking' ? (
                    <>
                      <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
                        Идет проверка
                      </h3>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        Почекайте...
                      </p>
                      <div className="mt-4">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/60">
                          <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-400" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
                        Поздравляем, Владик!
                      </h3>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        Вы получили Pro аккаунт на пицот лет. Дата окончания 20.01.2526. Спасибо!
                      </p>

                      <div className="mt-6 flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleVladikContinue()}
                          disabled={isProcessing}
                          className={`inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:from-red-600 hover:to-amber-600 ${
                            isProcessing ? 'cursor-not-allowed opacity-70' : ''
                          }`}
                        >
                          {isProcessing ? 'Оформляем...' : 'Перейти к летс гоуканию'}
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
