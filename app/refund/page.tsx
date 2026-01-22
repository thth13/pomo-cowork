export default function RefundPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 text-gray-900 dark:text-slate-100">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Refund Policy</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">Effective date: 22 January 2026</p>
      </header>

      <section className="mt-8 space-y-6 text-sm leading-6 text-gray-700 dark:text-slate-300">
        <p>
          This Refund Policy explains how refunds work for Pomo Cowork paid subscriptions and one-time purchases
          (if offered). This Policy applies to purchases processed by Paddle.
        </p>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">1. Definitions</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-medium">Subscription</span>: recurring access to paid features billed monthly or yearly (or as presented at checkout).
            </li>
            <li>
              <span className="font-medium">Billing period</span>: the time covered by a payment (e.g., one month or one year).
            </li>
            <li>
              <span className="font-medium">Purchase</span>: any paid transaction for the Service (subscription or one-time).
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">2. Refund window</h2>
          <p>
            You can request a refund within 14 days of the date of purchase or renewal. Requests made after
            14 days are not eligible for a refund.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">3. Cancellations</h2>
          <p>
            You can cancel your subscription at any time. Cancellation prevents the next renewal charge.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">4. How to request a refund</h2>
          <p>
            To request a refund, email{' '}
            <a
              href="mailto:support@pomo-co.work"
              className="underline underline-offset-2 hover:text-gray-900 dark:hover:text-white"
            >
              support@pomo-co.work
            </a>
            {' '}and include:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Account email</li>
            <li>Invoice/receipt ID (or approximate purchase date)</li>
            <li>Reason for the request</li>
          </ul>
          <p>
            If approved, refunds are returned to the original payment method. Processing time depends on
            your bank or payment provider.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">5. Changes to this Policy</h2>
          <p>
            We may update this Policy from time to time. The effective date above indicates the latest version.
          </p>
        </div>
      </section>
    </main>
  )
}
