import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import '../../(tools)/tools.css'

export default function SpanishToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="seo-shell garden-page" lang="es" data-i18n-ignore>
      <a className="seo-skip" href="#seo-content">Saltar al contenido</a>
      <header className="seo-header">
        <Link className="seo-brand" href="/es">Pomo Cowork</Link>
        <nav aria-label="Navegación principal">
          <Link href="/rooms">Salas de estudio</Link>
          <Link href="/es">Temporizador Pomodoro <span aria-hidden="true">↗</span></Link>
          <ThemeToggle />
        </nav>
      </header>
      {children}
      <footer className="seo-footer">
        <Link className="seo-brand" href="/es">Pomo Cowork</Link>
        <nav aria-label="Navegación del pie de página">
          <Link href="/pricing">Planes</Link><Link href="/privacy">Privacidad</Link><Link href="/terms">Condiciones</Link>
        </nav>
      </footer>
    </div>
  )
}
