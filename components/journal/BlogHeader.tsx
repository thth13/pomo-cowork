'use client'

import Image from 'next/image'
import Link from 'next/link'
import HomeLink from '@/components/HomeLink'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Plus, Timer } from 'lucide-react'
import AuthModal from '@/components/AuthModal'
import ThemeToggle from '@/components/ThemeToggle'
import { useAuthStore } from '@/store/useAuthStore'
import { useJournalText } from '@/lib/journal/client'
import { userProfileHref } from '@/lib/userProfile'

export default function BlogHeader() {
  const pathname = usePathname()
  const t = useJournalText()
  const user = useAuthStore(state => state.user)
  const loading = useAuthStore(state => state.isLoading)
  const [authOpen, setAuthOpen] = useState(false)
  const signedIn = user && !user.isAnonymous
  const links = [
    { href: '/projects/public', label: t('Projects', 'Proyectos'), active: pathname === '/projects/public' || /^\/@[^/]+\/projects\//.test(pathname) },
    { href: '/feed', label: t('Feed', 'Novedades'), active: pathname === '/feed' },
  ]

  return <header className="blog-header" data-i18n-ignore>
    <div className="blog-header-inner">
      <Link href="/projects/public" className="blog-header-brand" aria-label={t('Pomo Cowork blogs', 'Blogs de Pomo Cowork')}>
        <strong>Pomo<span className="blog-header-word">blogs</span></strong>
      </Link>
      <nav className="blog-header-nav" aria-label={t('Blog navigation', 'Navegación de blogs')}>
        {links.map(link => <Link key={link.href} href={link.href} aria-current={link.active ? 'page' : undefined}>{link.label}</Link>)}
      </nav>
      <div className="blog-header-actions">
        <HomeLink className="blog-header-timer" aria-label={t('Open timer', 'Abrir temporizador')} title={t('Open timer', 'Abrir temporizador')}><Timer size={17} aria-hidden="true" /><span>{t('Timer', 'Temporizador')}</span></HomeLink>
        <ThemeToggle variant="menu" />
        <Link href="/projects/public/new" className="blog-header-publish" aria-label={t('Share project', 'Compartir proyecto')} title={t('Share project', 'Compartir proyecto')}><Plus size={16} aria-hidden="true" /><span>{t('Share project', 'Compartir proyecto')}</span></Link>
        {signedIn ? <Link href={`${userProfileHref(user)}?view=blogs`} className="blog-header-account" title={user.username} aria-label={t('Open my profile', 'Abrir mi perfil')}>
          {user.avatarUrl ? <Image unoptimized src={user.avatarUrl} alt="" width={34} height={34} /> : <span aria-hidden="true">{user.username.slice(0, 1).toUpperCase()}</span>}
        </Link> : <button type="button" className="blog-header-signin" disabled={loading} onClick={() => setAuthOpen(true)}>{t('Sign in', 'Iniciar sesión')}</button>}
      </div>
    </div>
    <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
  </header>
}
