import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import WorkspaceBackground from '@/components/WorkspaceBackground'
import './tools.css'

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="seo-shell garden-page" lang="en" data-i18n-ignore>
      <WorkspaceBackground />
      <a className="seo-skip" href="#seo-content">Skip to content</a>
      <header className="seo-header">
        <Link className="seo-brand" href="/">Pomo Cowork</Link>
        <nav aria-label="Main navigation">
          <Link href="/rooms">Rooms</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/">Workspace <span aria-hidden="true">↗</span></Link>
          <ThemeToggle />
        </nav>
      </header>
      {children}
      <footer className="seo-footer">
        <Link className="seo-brand" href="/">Pomo Cowork</Link>
        <nav aria-label="Footer navigation"><Link href="/pricing">Pricing</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav>
      </footer>
    </div>
  )
}
