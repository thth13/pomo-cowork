export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 text-gray-900 dark:text-slate-100">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Privacy policy</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">Effective date: 17 January 2026</p>
      </header>

      <section className="mt-8 space-y-6 text-sm leading-6 text-gray-700 dark:text-slate-300">
        <p>
          This Privacy Policy explains how PM2 collects, uses, and protects information when you use the
          service.
        </p>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">1. Data we collect</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Account data: email, name, and authentication identifiers.</li>
            <li>Usage data: sessions, tasks, settings, and device metadata.</li>
            <li>Support data: messages you send to us.</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">2. How we use data</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Provide, maintain, and improve the service.</li>
            <li>Secure the service and prevent abuse.</li>
            <li>Communicate updates and account information.</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">3. Sharing</h2>
          <p>
            We do not sell personal data. We only share data with service providers that help us operate
            the service and with authorities when legally required.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">4. Retention</h2>
          <p>
            We retain data as long as your account is active or as needed to provide the service. You can
            request deletion of your data.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">5. Your rights</h2>
          <p>
            You may access, correct, or delete your personal data. Contact support@pm2.app for requests.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">6. Security</h2>
          <p>
            We use industry-standard safeguards to protect data. No method of transmission is 100%
            secure.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">7. Changes</h2>
          <p>
            We may update this policy from time to time. If changes are material, we will notify you in
            the app or by email.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">8. Contact</h2>
          <p>
            If you have questions, contact us at support@pm2.app.
          </p>
        </div>
      </section>
    </main>
  )
}
