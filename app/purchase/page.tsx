import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import PurchaseCTA from '@/components/PurchaseCTA'

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your purchase.',
}

const planDetails: Record<string, { name: string; originalPrice: string; cadence: string }> = {
  'pro-yearly': { name: 'Pro (Yearly)', originalPrice: '$49.99', cadence: 'per year' },
  'pro-monthly': { name: 'Pro (Monthly)', originalPrice: '$4.99', cadence: 'per month' },
}

export default function PurchasePage({
  searchParams,
}: {
  searchParams?: { plan?: string }
}) {
  const planId = (searchParams?.plan ?? 'pro-yearly') as 'pro-yearly' | 'pro-monthly'
  const selectedPlan = planDetails[planId] ?? planDetails['pro-yearly']
  const priceLabel = selectedPlan.originalPrice

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Checkout
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              Complete your order
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Secure checkout for your Pro subscription.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Plan details</h2>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      {selectedPlan.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Billed {selectedPlan.cadence}. Cancel anytime.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{priceLabel}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Payment method</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Your payment method will be processed securely.
                </p>
                <div className="mt-4 grid gap-3">
                  <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <span>Card details</span>
                    <span>Pending</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <span>Billing address</span>
                    <span>Pending</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">What you get</h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li>• Instant Pro activation</li>
                  <li>• Private rooms and advanced analytics</li>
                  <li>• Priority support</li>
                </ul>
              </div>
            </div>

            <div className="space-y-6 lg:sticky lg:top-24">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800/60">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Order summary</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>Subtotal</span>
                    <span>{selectedPlan.originalPrice}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-3 text-base font-semibold text-slate-900 dark:border-slate-700 dark:text-white">
                    <div className="flex items-center justify-between">
                      <span>Total due</span>
                      <span>{priceLabel}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <PurchaseCTA priceLabel={priceLabel} planName={selectedPlan.name} planId={planId} />
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  By placing the order, you agree to our Terms and Privacy Policy.
                </p>
              </div>

            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
