import Link from 'next/link'
import HomeLink from '@/components/HomeLink'
import ThemeToggle from '@/components/ThemeToggle'
import './blog.css'

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="blog-shell" lang="en" data-i18n-ignore>
      <a href="#blog-content" className="blog-skip">Skip to content</a>
      <header className="blog-header">
        <HomeLink className="blog-brand">Pomo Cowork</HomeLink>
        <nav aria-label="Blog navigation">
          <Link href="/blog">Blog</Link>
          <HomeLink>Open timer <span aria-hidden="true">↗</span></HomeLink>
          <ThemeToggle />
        </nav>
      </header>
      {children}
      <footer className="blog-footer"><Link href="/blog">Pomo Cowork Blog</Link><Link href="/pomodoro-timer">Pomodoro timer</Link><Link href="/study-timer">Study timer</Link><HomeLink>Make time for one thing.</HomeLink></footer>
    </div>
  )
}
