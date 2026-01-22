import dynamic from 'next/dynamic'

const SupportContact = dynamic(() => import('@/components/SupportContact'), {
  ssr: false,
  loading: () => null,
})

export default function RefundPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 text-gray-900 dark:text-slate-100">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Refund Policy</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Effective date: 22 January 2026
        </p>
      </header>

      <section className="mt-8 space-y-6 text-sm leading-6 text-gray-700 dark:text-slate-300">
        <p>
          This Refund Policy explains how refunds work for Pomo Cowork paid subscriptions. All payments are
          processed by Paddle.com, which acts as the Merchant of Record.
        </p>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            1. Definitions
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-medium">Subscription</span>: recurring access to paid features billed monthly
              or yearly (as presented at checkout).
            </li>
            <li>
              <span className="font-medium">Billing period</span>: the time covered by a payment
              (e.g., one month or one year).
            </li>
            <li>
              <span className="font-medium">Purchase</span>: any subscription payment for the Service.
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            2. Refunds
          </h2>
          <p>
            You may request a refund within 14 days of the initial purchase or renewal, in accordance with
            Paddle’s consumer refund policy and applicable law.
          </p>
          <p>
            Refund requests submitted after this period may still be handled by Paddle in cases required by law
            or under Paddle’s policies (for example, billing errors or unauthorized charges).
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            3. Cancellations
          </h2>
          <p>
            You may cancel your subscription at any time. Cancellation will stop future renewal charges.
            Cancellation does not automatically result in a refund for the current billing period, except where
            required by Paddle’s refund policy or applicable law.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            4. How to request a refund
          </h2>
          <p>
            To request a refund, please contact Paddle support or use our{' '}
            <SupportContact inline triggerLabel="contact support" /> and include:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Account email</li>
            <li>Invoice or receipt ID (or approximate purchase date)</li>
            <li>Reason for the request</li>
          </ul>
          <p>
            All refunds are processed by Paddle and returned to the original payment method. Processing time
            depends on your bank or payment provider.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            5. Paddle terms
          </h2>
          <p>
            This Refund Policy is intended to comply with Paddle’s consumer terms. In the event of any conflict
            between this Policy and Paddle’s policies, Paddle’s policies shall prevail.
          </p>
          <p>
            Paddle Consumer Terms:{' '}
            <a
              href="https://www.paddle.com/legal/invoiced-consumer-terms"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              https://www.paddle.com/legal/invoiced-consumer-terms
            </a>
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            6. Changes to this Policy
          </h2>
          <p>
            We may update this Policy from time to time. The effective date above indicates the latest version.
          </p>
        </div>
      </section>
    </main>
  )
}
