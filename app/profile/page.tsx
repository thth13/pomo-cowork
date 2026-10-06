'use client'

import { userProfileHref } from '@/lib/userProfile'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sprout } from 'lucide-react'
import Navbar from '@/components/Navbar'
import AuthModal from '@/components/AuthModal'
import { useAuthStore } from '@/store/useAuthStore'
import { useI18n } from '@/components/I18nProvider'
import { communityCopy } from '@/lib/i18n/community'
import PersonalPageSkeleton from '@/components/PersonalPageSkeleton'
import PersonalNavigation from '@/components/PersonalNavigation'

export default function ProfilePage() {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuthStore()
  const { language } = useI18n()
  const copy = communityCopy[language]
  const [authOpen, setAuthOpen] = useState(false)
  const showingProfile = isLoading || (isAuthenticated && Boolean(user?.id))

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.id) router.replace(userProfileHref(user))
  }, [isLoading, isAuthenticated, user?.id, user?.username, user?.isAnonymous, router])

  return <div className={`community-page garden-page${showingProfile ? ' profile-page' : ''}`} lang={language} data-no-translate>
    <Navbar compact />
    <main className={`community-layout${showingProfile ? ' personal-page-frame' : ''}`}>
      {showingProfile && <PersonalNavigation />}
      {showingProfile ? <PersonalPageSkeleton variant="profile" /> : <>
        <Link href="/" className="community-link"><ArrowLeft size={15} aria-hidden="true" />{copy.back}</Link>
        <section className="community-panel community-state">
          <Sprout aria-hidden="true" /><h1>{copy.authTitle}</h1><p>{copy.authHint}</p>
          <button type="button" className="community-button community-button-primary" onClick={() => setAuthOpen(true)}>{copy.signIn}</button>
        </section>
      </>}
    </main>
    <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="login" />
  </div>
}
