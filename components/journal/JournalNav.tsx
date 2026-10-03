'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import BackToTimer from '@/components/BackToTimer'
import ThemeToggle from '@/components/ThemeToggle'
import { usernameFromHandle } from '@/lib/journal/handles'
import { useJournalText } from '@/lib/journal/client'
import { useAuthStore } from '@/store/useAuthStore'
function useCompactJournalNav() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  const isPublicProfile = Boolean(usernameFromHandle(segments[0] || ''))
  return segments[0] === 'projects' ||
    (isPublicProfile && (segments.length === 1 || segments[1] === 'projects'))
}

export function JournalBackToTimer() {
  const compact = useCompactJournalNav()
  const pathname = usePathname()
  return compact && pathname !== '/projects' ? <div className="journal-back-to-timer"><BackToTimer /></div> : null
}

export default function JournalNav(){
  const t=useJournalText(),user=useAuthStore(state=>state.user)
  const useCompactNav = useCompactJournalNav()

  if (useCompactNav) return <Navbar compact />

  return <header className="journal-nav"><Link href="/" className="journal-brand">Pomo Cowork</Link><nav aria-label={t('Journal navigation','Navegación del diario')}>
    <Link href="/">{t('Timer','Temporizador')}</Link><Link href="/feed">{t('Feed','Novedades')}</Link><Link href="/projects">{t('My projects','Mis proyectos')}</Link><Link href="/journal">{t('My updates','Mis actualizaciones')}</Link><Link href={user ? `/user/${encodeURIComponent(user.id)}` : '/settings/profile'}>{t('My profile','Mi perfil')}</Link><Link href="/settings/profile">{t('Edit profile','Editar perfil')}</Link><ThemeToggle/>
  </nav></header>
}
