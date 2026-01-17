export default function RefundPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 text-gray-900 dark:text-slate-100">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Refund policy</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">Effective date: 17 January 2026</p>
      </header>

      <section className="mt-8 space-y-6 text-sm leading-6 text-gray-700 dark:text-slate-300">
        <p>
          This Refund Policy explains when and how refunds are issued for paid subscriptions or
          one-time purchases.
        </p>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">1. Subscriptions</h2>
          <p>
            Subscription fees are billed in advance. You can cancel anytime; access remains until the end
            of the current billing period. We do not provide prorated refunds for unused time unless
            required by law.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">2. One-time purchases</h2>
          <p>
            One-time purchases are generally non-refundable once delivered, unless required by law.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">3. Exceptions</h2>
          <p>
            We may issue refunds at our discretion in cases of duplicate charges, technical issues, or
            other exceptional circumstances.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">4. How to request</h2>
          <p>
            Contact support@pm2.app with your account email, invoice ID, and a short explanation. We will
            respond within 5 business days.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">5. Changes</h2>
          <p>
            We may update this policy from time to time. If changes are material, we will notify you in
            the app or by email.
          </p>
        </div>
      </section>
    </main>
  )
}
