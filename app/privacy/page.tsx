import dynamic from 'next/dynamic'

const SupportContact = dynamic(() => import('@/components/SupportContact'), {
  ssr: false,
  loading: () => null,
})

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 text-gray-900 dark:text-slate-100">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Privacy Policy</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">Effective date: 17 January 2026</p>
      </header>

      <section className="mt-8 space-y-6 text-sm leading-6 text-gray-700 dark:text-slate-300">
        <p>
          This Privacy Policy explains how Pomo Cowork (&quot;Pomo Cowork&quot;, &quot;we&quot;, &quot;us&quot;) collects, uses, shares, and protects
          information when you use our website, applications, and related services (collectively, the
          &quot;Service&quot;).
        </p>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">1. Scope</h2>
          <p>
            This Policy applies to information processed by Pomo Cowork in connection with the Service. It does
            not cover third-party websites, services, or apps you may access via links or integrations.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">2. Information we collect</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-medium">Account data:</span> email address, name (if provided), authentication identifiers, account preferences.
            </li>
            <li>
              <span className="font-medium">Service content:</span> data you submit to the Service (e.g., tasks, notes, settings, uploads).
            </li>
            <li>
              <span className="font-medium">Support data:</span> messages you send to support and related metadata (e.g., time, account id).
            </li>
            <li>
              <span className="font-medium">Usage data:</span> feature usage, interaction events, approximate location derived from IP, timestamps, and performance data.
            </li>
            <li>
              <span className="font-medium">Device & log data:</span> IP address, user agent, device type, OS version, language, and diagnostic logs.
            </li>
            <li>
              <span className="font-medium">Payment data:</span> subscription status, plan, billing cycle, and transaction identifiers. Payment card details are processed by our payment
              processor; we do not store full card numbers.
            </li>
            <li>
              <span className="font-medium">Cookies & similar technologies:</span> used for authentication, security, preferences, and analytics (where enabled).
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">3. How we use information</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Provide, operate, and maintain the Service (including account creation and login).</li>
            <li>Process subscriptions, billing, refunds, and prevent payment fraud.</li>
            <li>Personalize your experience (preferences, settings, and saved state).</li>
            <li>Monitor, debug, and improve performance, reliability, and features.</li>
            <li>Secure the Service, detect abuse, and enforce our terms.</li>
            <li>Communicate service-related messages (e.g., receipts, security alerts, important changes).</li>
            <li>Respond to support requests and resolve issues.</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">4. Legal bases (EEA/UK, where applicable)</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-medium">Contract:</span> to provide the Service and subscriptions you request.
            </li>
            <li>
              <span className="font-medium">Legitimate interests:</span> to secure, maintain, and improve the Service, prevent fraud, and provide support.
            </li>
            <li>
              <span className="font-medium">Consent:</span> where required for certain cookies/analytics or marketing communications (if any).
            </li>
            <li>
              <span className="font-medium">Legal obligations:</span> accounting, tax, and compliance requirements.
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">5. How we share information</h2>
          <p>We do not sell your personal information. We may share information:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-medium">With service providers (processors):</span> hosting, databases, analytics, error monitoring, email delivery, and payment processing — only as needed to provide the Service.
            </li>
            <li>
              <span className="font-medium">For legal reasons:</span> to comply with lawful requests, protect rights and safety, and enforce our terms.
            </li>
            <li>
              <span className="font-medium">Business transfers:</span> in connection with a merger, acquisition, financing, or sale of assets (with appropriate safeguards).
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">6. International transfers</h2>
          <p>
            We may process and store information in countries other than your own. Where required, we
            use appropriate safeguards for cross-border transfers (for example, contractual protections).
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">7. Data retention</h2>
          <p>
            We retain information for as long as necessary to provide the Service and for legitimate and
            essential business purposes (e.g., security, dispute resolution, enforcing agreements), and
            as required by law (e.g., accounting and tax). You can request deletion as described below.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">8. Security</h2>
          <p>
            We use reasonable administrative, technical, and organizational measures to protect
            information. No method of transmission or storage is 100% secure.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">9. Your rights and choices</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-medium">Access, correction, deletion:</span> you may request access to, correction of, or deletion of your personal data.
            </li>
            <li>
              <span className="font-medium">Objection / restriction:</span> you may object to or request restriction of certain processing where applicable.
            </li>
            <li>
              <span className="font-medium">Portability:</span> you may request a copy of certain data in a portable format where applicable.
            </li>
            <li>
              <span className="font-medium">Withdraw consent:</span> where processing is based on consent, you can withdraw it at any time.
            </li>
          </ul>
          <p>
            To make a request, <SupportContact inline triggerLabel="contact support" />. We may need to verify your identity.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">10. Children</h2>
          <p>
            The Service is not intended for children under 16 (or the age of digital consent in your
            country). If you believe a child provided personal data, please <SupportContact inline triggerLabel="contact support" />.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">11. Cookies</h2>
          <p>
            We use cookies and similar technologies for authentication, security, and preferences. Where
            applicable, you can control cookies via your browser settings. Disabling cookies may affect
            parts of the Service.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">12. Changes to this Policy</h2>
          <p>
            We may update this Policy from time to time. If changes are material, we will provide notice
            in the Service or by email. The &quot;Effective date&quot; above indicates when this Policy was last updated.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">13. Contact</h2>
          <p>
            If you have questions about this Policy or our privacy practices, <SupportContact inline triggerLabel="contact support" />.
          </p>
        </div>
      </section>
    </main>
  )
}
