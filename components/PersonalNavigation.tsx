'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'

const destinations = [
  { href: '/profile', label: { en: 'Profile', es: 'Perfil' }, matches: (pathname: string) => pathname === '/profile' || pathname.startsWith('/user/') },
  { href: '/habits', label: { en: 'Habits', es: 'Hábitos' }, matches: (pathname: string) => pathname === '/habits' },
  { href: '/projects', label: { en: 'Projects', es: 'Proyectos' }, matches: (pathname: string) => pathname.startsWith('/projects') },
  { href: '/rooms', label: { en: 'Rooms', es: 'Salas' }, matches: (pathname: string) => pathname.startsWith('/rooms') },
  { href: '/leaderboard', label: { en: 'Leaderboard', es: 'Clasificación' }, matches: (pathname: string) => pathname === '/leaderboard' },
  { href: '/statistics', label: { en: 'Statistics', es: 'Estadísticas' }, matches: (pathname: string) => pathname === '/statistics' },
]

export default function PersonalNavigation() {
  const pathname = usePathname()
  const { language } = useI18n()

  return (
    <nav className="personal-navigation" aria-label={language === 'es' ? 'Navegación personal' : 'Personal navigation'}>
      <Link href="/" className="personal-navigation-timer">
        <ArrowLeft size={15} aria-hidden="true" />
        {language === 'es' ? 'Volver al temporizador' : 'Back to timer'}
      </Link>
      {destinations.map(({ href, label, matches }) => {
        const active = matches(pathname)
        return (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={active ? 'is-active' : undefined}>
            {label[language]}
          </Link>
        )
      })}
    </nav>
  )
}
