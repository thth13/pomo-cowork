import dynamic from 'next/dynamic'
import Link from 'next/link'

const SupportContact = dynamic(() => import('@/components/SupportContact'), {
  ssr: false,
  loading: () => null,
})

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 text-gray-900 dark:text-slate-100">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Terms of Service</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">Effective date: 19 January 2026</p>
      </header>

      <section className="mt-8 space-y-6 text-sm leading-6 text-gray-700 dark:text-slate-300">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Pomo Cowork website, apps, and
          related services (&quot;Service&quot;). By creating an account, purchasing a subscription, or using the
          Service, you agree to these Terms.
        </p>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">1. Eligibility</h2>
          <p>
            You must be at least 16 years old (or the age of digital consent in your country) to use the
            Service. By using the Service, you represent that you meet this requirement and have the
            legal capacity to enter into these Terms.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">2. Account and security</h2>
          <p>
            You are responsible for your account, credentials, and all activity under your account. You
            must provide accurate information and keep it up to date. Notify us immediately if you
            suspect unauthorized access.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">3. Acceptable use</h2>
          <p>You agree not to misuse the Service. In particular, you will not:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>break the law or infringe the rights of others;</li>
            <li>attempt to access, probe, or disrupt our systems or security;</li>
            <li>upload malware, spam, or abusive content;</li>
            <li>reverse engineer, decompile, or attempt to extract source code;</li>
            <li>use the Service to provide a competing product or service.</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">4. Your content</h2>
          <p>
            You retain ownership of the content you submit (&quot;User Content&quot;). You grant us a worldwide,
            non-exclusive, royalty-free license to host, process, transmit, and display User Content only
            as needed to operate, secure, and improve the Service. You represent that you have all rights
            necessary to grant this license.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">5. Service changes</h2>
          <p>
            We may update, modify, or discontinue features from time to time. We will make reasonable
            efforts to provide notice of material changes that adversely impact paid subscribers.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">6. Subscriptions and billing</h2>
          <p>
            Paid plans are billed in advance on a recurring basis (monthly or yearly) unless stated
            otherwise at checkout. Prices, taxes, renewal dates, and payment methods are shown before you
            complete a purchase.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Auto-renewal: your subscription renews automatically unless cancelled before renewal.</li>
            <li>Cancellation: you can cancel anytime in your account settings; access continues until the end of the current period.</li>
            <li>Trials and promotions: trial duration and eligibility are displayed at checkout; unused trial time is forfeited upon conversion.</li>
            <li>Price changes: we may change prices with advance notice; changes apply at the next renewal.</li>
            <li>Taxes: you are responsible for applicable taxes unless stated otherwise.</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">7. Refunds</h2>
          <p>
            Fees are generally non-refundable except where required by law. If you believe a billing
            error occurred, contact us within 14 days of the charge. Statutory consumer rights remain
            unaffected.
          </p>
          <p>
            For details, see our{' '}
            <Link
              href="/refund"
              className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Refund Policy
            </Link>
            , which is incorporated by reference.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">8. Third-party services</h2>
          <p>
            The Service may integrate with or link to third-party services (e.g., payment processors,
            analytics). Their terms and privacy policies apply to your use of those services, and we are
            not responsible for them.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">9. Intellectual property</h2>
          <p>
            The Service, including its software, design, and branding, is owned by us or our licensors
            and is protected by intellectual property laws. You may not use our trademarks without prior
            written permission.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">10. Feedback</h2>
          <p>
            If you provide feedback, you grant us a perpetual, irrevocable, worldwide, royalty-free
            license to use it without compensation or obligation to you.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">11. Suspension and termination</h2>
          <p>
            We may suspend or terminate access if you violate these Terms, misuse the Service, or if
            required by law. You may stop using the Service at any time. Upon termination, your right to
            access the Service ends.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">12. Data export and deletion</h2>
          <p>
            You can export or delete your data using available in-app tools. We may retain limited data
            as required by law or for legitimate business purposes (e.g., fraud prevention, accounting).
            Our collection and use of personal data is described in our{' '}
            <Link
              href="/privacy"
              className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">13. Disclaimers</h2>
          <p>
            The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express
            or implied. We do not warrant that the Service will be uninterrupted, secure, or error-free.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">14. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, we are not liable for indirect, incidental, special,
            consequential, or punitive damages, or for loss of profits, revenue, data, or goodwill. Our
            total liability for any claim is limited to the amount paid by you to us for the Service in
            the 12 months preceding the event giving rise to the claim.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">15. Indemnification</h2>
          <p>
            You agree to indemnify and hold us harmless from claims arising out of your use of the
            Service or violation of these Terms.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">16. Governing law and disputes</h2>
          <p>
            These Terms are governed by the laws applicable where you reside for consumer transactions,
            unless a different law is required by mandatory provisions. If a dispute arises, we will
            try to resolve it informally first. You can <SupportContact inline triggerLabel="contact support" />.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">17. Changes to these Terms</h2>
          <p>
            We may update these Terms from time to time. If changes are material, we will provide notice
            in the app or by email before they take effect. Continued use after the effective date means
            you accept the updated Terms.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">18. Contact</h2>
          <p>
            Questions about these Terms? Use our support form.
          </p>
          <SupportContact
            triggerLabel="Contact support"
            triggerClassName="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          />
        </div>
      </section>
    </main>
  )
}
