'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sprout } from 'lucide-react'
import Navbar from '@/components/Navbar'
import AuthModal from '@/components/AuthModal'
import { useAuthStore } from '@/store/useAuthStore'
import { useI18n } from '@/components/I18nProvider'
import { communityCopy } from '@/lib/i18n/community'

export default function ProfilePage() {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuthStore()
  const { language } = useI18n()
  const copy = communityCopy[language]
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.id) router.replace(`/@${encodeURIComponent(user.username)}`)
  }, [isLoading, isAuthenticated, user?.id, user?.username, router])

  return <div className="community-page garden-page" lang={language} data-no-translate>
    <Navbar compact />
    <main className="community-layout">
      <Link href="/" className="community-link"><ArrowLeft size={15} aria-hidden="true" />{copy.back}</Link>
      <section className="community-panel community-state">
        {isLoading || (isAuthenticated && user?.id) ? <div role="status" className="community-state"><span className="community-spinner" aria-hidden="true" />{copy.loading}</div> : <>
          <Sprout aria-hidden="true" /><h1>{copy.authTitle}</h1><p>{copy.authHint}</p>
          <button type="button" className="community-button community-button-primary" onClick={() => setAuthOpen(true)}>{copy.signIn}</button>
        </>}
      </section>
    </main>
    <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="login" />
  </div>
}
