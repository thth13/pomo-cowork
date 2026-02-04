import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes, faCheck } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { useState } from 'react'

interface PaywallModalProps {
  onClose: () => void
}

export const PaywallModal = ({ onClose }: PaywallModalProps) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const checkoutHref = selectedPlan === 'yearly'
    ? '/purchase?plan=pro-yearly'
    : '/purchase?plan=pro-monthly'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[96svh] sm:max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
        >
          <FontAwesomeIcon icon={faTimes} className="text-xl" />
        </button>

        <div className="p-4 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 mb-6 shadow-lg">
              <span className="font-bold text-sm tracking-wide">Pro Plan</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Upgrade to Pro
            </h2>
            <p className="text-gray-600 dark:text-slate-300 max-w-md mx-auto">
              Unlock the full power of your productivity journey with advanced tools and insights.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mb-6">
            <div className="space-y-3 sm:space-y-6">
              <h3 className="hidden sm:flex font-bold text-gray-900 dark:text-white items-center gap-2">
                What&apos;s included
              </h3>
              <ul className="grid grid-cols-2 sm:grid-cols-1 gap-x-4 gap-y-2 sm:gap-y-3">
                {[
                  "Create private rooms",
                  "Advanced statistics & heatmap",
                  "Manual time entry & editing",
                  "Priority support",
                  "Support the project ❤️",
                  "Pro badge on profile",
                  "Time tracker mode"
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[14px] sm:text-sm text-gray-600 dark:text-slate-300">
                    <div className="mt-0.5 min-w-[18px] text-green-500">
                       <FontAwesomeIcon icon={faCheck} className="text-sm" />
                    </div>
                    <span className="leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-4">
              <div 
                onClick={() => setSelectedPlan('yearly')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                  selectedPlan === 'yearly' 
                    ? 'border-red-500 bg-red-50/60 dark:bg-red-900/10 ring-4 ring-red-500/10' 
                    : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-300 dark:hover:border-amber-600'
                }`}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 text-[10px] uppercase font-bold px-3 py-1 rounded-full shadow-md">
                  Best Value
                </div>
                <div className="flex justify-between items-center mb-1 mt-1">
                  <span className="font-semibold text-gray-900 dark:text-white">12 months</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">$49.99</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                  $4.17/month · Save ~17%
                </div>
              </div>

              <div 
                onClick={() => setSelectedPlan('monthly')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedPlan === 'monthly'
                    ? 'border-red-500 bg-red-50/60 dark:bg-red-900/10 ring-4 ring-red-500/10'
                    : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-300 dark:hover:border-amber-600'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-gray-900 dark:text-white">1 month</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">$4.99</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  Billed monthly
                </div>
              </div>
              
              <Link
                href={checkoutHref}
                className="w-full mt-4 py-3.5 px-4 inline-flex items-center justify-center bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/25 hover:shadow-amber-500/30 active:scale-95"
              >
                Continue to checkout
              </Link>

              <p className="text-[11px] text-center text-gray-500 dark:text-slate-400">
                By continuing, you agree to our{' '}
                <Link href="/terms" className="underline underline-offset-2 hover:text-gray-700 dark:hover:text-slate-200">
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline underline-offset-2 hover:text-gray-700 dark:hover:text-slate-200">
                  Privacy Policy
                </Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
