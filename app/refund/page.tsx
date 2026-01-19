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
        <p className="text-sm text-gray-500 dark:text-slate-400">Effective date: 17 January 2026</p>
      </header>

      <section className="mt-8 space-y-6 text-sm leading-6 text-gray-700 dark:text-slate-300">
        <p>
          This Refund Policy explains how refunds work for Pomo Cowork paid subscriptions and one-time purchases
          (if offered). This Policy applies to purchases made directly through Pomo Cowork unless a different
          store policy applies.
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
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">2. Cancellations</h2>
          <p>
            You can cancel your subscription at any time. After cancellation, you will retain access to
            paid features until the end of your current billing period. Cancellation prevents the next
            renewal charge; it does not automatically refund the current billing period.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">3. General refund rule</h2>
          <p>
            Subscription fees are billed in advance. We do not provide prorated refunds or credits for
            unused time in a billing period, except where required by applicable law or expressly stated
            in this Policy.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">4. Free trials and discounts</h2>
          <p>
            If a free trial is offered, you can cancel before the trial ends to avoid being charged. If a
            discounted first period is offered, refunds (if any) are assessed based on the amount paid.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">5. When we may refund</h2>
          <p>We may issue a full or partial refund in our reasonable discretion, for example if:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>You were charged multiple times for the same billing period.</li>
            <li>A renewal charge was made in error (e.g., after a confirmed cancellation due to a technical issue).</li>
            <li>The Service was materially unavailable for an extended period and you could not reasonably use it.</li>
            <li>A purchase was unauthorized, and we can verify it (we may request supporting information).</li>
          </ul>
          <p>
            Approved refunds are issued to the original payment method where possible. If that is not
            possible, we may use an alternative method.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">6. Non-refundable cases</h2>
          <p>Except where required by law, we generally do not refund:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Unused time after you cancel a subscription.</li>
            <li>Failure to use the Service or forgetting to cancel before renewal.</li>
            <li>Issues caused by your device, network, browser extensions, or third-party services outside our control.</li>
            <li>One-time purchases after delivery or activation (if applicable).</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">7. Statutory consumer rights (EEA/UK)</h2>
          <p>
            If you are a consumer in the EEA/UK, you may have a legal right to withdraw from certain
            purchases within 14 days. Where applicable to digital services/content, you may be asked to
            explicitly consent to immediate performance and acknowledge that you lose your withdrawal
            right once the service is fully performed or digital content is delivered. Nothing in this
            Policy affects your statutory rights.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">8. Chargebacks</h2>
          <p>
            If you initiate a chargeback without first contacting support, we may suspend your account
            while we investigate. We encourage you to <SupportContact inline triggerLabel="contact support" /> first so we
            can resolve billing issues quickly.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">9. How to request a refund</h2>
          <p>
            To request a refund, <SupportContact inline triggerLabel="contact support" /> and include:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Account email</li>
            <li>Invoice/receipt ID (or approximate purchase date)</li>
            <li>Reason for the request</li>
          </ul>
          <p>
            We typically respond within 5 business days. If approved, processing time depends on your
            bank/payment provider (often 5–10 business days).
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">10. Taxes and fees</h2>
          <p>
            Refunds may exclude taxes or fees where they are non-refundable or where required by law.
            Currency conversion differences and bank fees are not refundable.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">11. Changes to this Policy</h2>
          <p>
            We may update this Policy from time to time. If changes are material, we will provide notice
            in the Service or by email. The effective date above indicates the latest version.
          </p>
        </div>
      </section>
    </main>
  )
}
