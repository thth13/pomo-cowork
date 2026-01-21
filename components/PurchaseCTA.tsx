'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [vladikStep, setVladikStep] = useState<'question' | 'checking' | 'congrats'>('question')
  const vladikTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isVladik = user?.id === 'cmklkzcqr0000snb3bo8hddjv'

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

  const handleContinue = async (options?: { redirectTo?: string }) => {
    try {
      setIsProcessing(true)
      const authToken = token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`
      }

      await fetch('/api/purchase', {
        method: 'POST',
        headers,
        body: JSON.stringify({ planId }),
      })
      await checkAuth()
      router.push(options?.redirectTo ?? '/')
    } finally {
      setIsProcessing(false)
      setIsPurchaseModalOpen(false)
    }
  }

  return (
    <>
      {isAuthenticated ? (
        <button
          type="button"
          onClick={() => {
            clearVladikTimer()
            setVladikStep('question')
            setIsPurchaseModalOpen(true)
          }}
          className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:from-red-600 hover:to-amber-600"
        >
          Purchase for {priceLabel}
        </button>
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
                          onClick={() => handleContinue({ redirectTo: '/' })}
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
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                      Purchase successful
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPurchaseModalOpen(false)}
                      className="rounded-lg px-2 py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      ✕
                    </button>
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
                    You now have Pro access 🎉
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Your {planName ?? 'Pro'} subscription is active.
                  </p>

                  <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                    Payments are temporarily unavailable. Your Pro access has been granted for free.
                  </p>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleContinue()}
                      disabled={isProcessing}
                      className={`inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:from-red-600 hover:to-amber-600 ${
                        isProcessing ? 'cursor-not-allowed opacity-70' : ''
                      }`}
                    >
                      {isProcessing ? 'Activating...' : 'Continue'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
