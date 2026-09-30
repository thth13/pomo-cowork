'use client'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import { useJournalText } from '@/lib/journal/client'
import { useAuthStore } from '@/store/useAuthStore'
import { profileHref } from '@/lib/journal/types'
export default function JournalNav(){
  const t=useJournalText(),user=useAuthStore(state=>state.user)
  return <header className="journal-nav"><Link href="/" className="journal-brand">Pomo Cowork</Link><nav aria-label={t('Journal navigation','Navegación del diario')}>
    <Link href="/">{t('Timer','Temporizador')}</Link><Link href="/feed">{t('Feed','Novedades')}</Link><Link href="/projects">{t('My projects','Mis proyectos')}</Link><Link href="/journal">{t('My updates','Mis actualizaciones')}</Link><Link href={user?profileHref(user.username):'/settings/profile'}>{t('My profile','Mi perfil')}</Link><Link href="/settings/profile">{t('Edit profile','Editar perfil')}</Link><ThemeToggle/>
  </nav></header>
}
