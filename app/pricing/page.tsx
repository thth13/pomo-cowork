import Link from 'next/link'
import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import PricingPlanCta from '../../components/PricingPlanCta'

interface PricingPlan {
  id: 'free' | 'pro-yearly' | 'pro-monthly'
  name: string
  price: string
  cadence: string
  description: string
  badge?: string
  cta: {
    label: string
    href: string
  }
  features: string[]
  highlighted?: boolean
}

const plans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    description: 'Everything you need to start focused sessions.',
    cta: {
      label: 'Start for free',
      href: '/rooms',
    },
    features: [
      'Pomodoro timer mode included',
      'Join public rooms',
      'Lightweight activity stats',
    ],
  },
  {
    id: 'pro-yearly',
    name: 'Pro',
    price: '$60',
    cadence: 'per year',
    description: 'Best value for individuals who want full power.',
    badge: 'Best value',
    highlighted: true,
    cta: {
      label: 'Continue to checkout',
      href: '/purchase?plan=pro-yearly',
    },
    features: [
      'Create private rooms',
      'Advanced statistics & heatmap',
      'Manual time entry & editing',
      'Priority support',
      'Pro badge on profile',
      'Time tracker mode'
    ],
  },
  {
    id: 'pro-monthly',
    name: 'Pro Monthly',
    price: '$7',
    cadence: 'per month',
    description: 'Full Pro features with flexible billing.',
    cta: {
      label: 'Continue to checkout',
      href: '/purchase?plan=pro-monthly',
    },
    features: [
      'All Pro features included',
      'Cancel anytime',
    ],
  },
]

export const metadata: Metadata = {
  title: 'Pricing • Pomo Cowork',
  description:
    'Compare Free, Pro yearly, and Pro monthly plans. Unlock private rooms, advanced analytics, and priority support.',
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-10 sm:px-6 lg:px-8">
        <section className="mb-12 text-center">
        <h1 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
          Choose a plan that keeps you focused
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          Unlock private rooms, advanced analytics, and a cleaner experience. Support the project
          while getting the tools serious sessions demand.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex h-full flex-col rounded-2xl border px-6 pb-6 pt-5 shadow-sm transition-all ${
              plan.highlighted
                ? 'border-red-500/60 bg-red-50/60 shadow-red-500/10 dark:border-red-500/70 dark:bg-red-900/10'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            {plan.badge ? (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-1 text-[10px] font-bold uppercase text-slate-900 shadow-md">
                {plan.badge}
              </span>
            ) : null}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{plan.name}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{plan.description}</p>
            </div>
            <div className="mb-4 flex items-end gap-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">{plan.price}</span>
              <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {plan.cadence}
              </span>
            </div>
            <PricingPlanCta
              planId={plan.id}
              ctaHref={plan.cta.href}
              ctaLabel={plan.cta.label}
              highlighted={plan.highlighted}
            />
            <ul className="mt-2 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        By continuing, you agree to our{' '}
        <Link href="/terms" className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200">
          Privacy Policy
        </Link>.
      </p>

      <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
        See our{' '}
        <Link href="/refund" className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200">
          Refund Policy
        </Link>.
      </p>

      {/**
      <section className="mt-12 rounded-2xl border border-slate-200 bg-white px-6 py-8 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Need a team plan?</h3>
            <p className="mt-1">
              We can offer custom billing, team analytics, and onboarding support.
            </p>
          </div>
          <Link
            href="mailto:support@yourdomain.com"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-800 transition-all hover:border-amber-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:border-amber-600"
          >
            Contact us
          </Link>
        </div>
      </section>
      */}

      </main>

    </div>
  )
}
