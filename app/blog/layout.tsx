import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import './blog.css'

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="blog-shell" lang="en" data-i18n-ignore>
      <a href="#blog-content" className="blog-skip">Skip to content</a>
      <header className="blog-header">
        <Link href="/" className="blog-brand">Pomo Cowork</Link>
        <nav aria-label="Blog navigation">
          <Link href="/blog">Blog</Link>
          <Link href="/">Open timer <span aria-hidden="true">↗</span></Link>
          <ThemeToggle />
        </nav>
      </header>
      {children}
      <footer className="blog-footer"><Link href="/blog">Pomo Cowork Blog</Link><Link href="/">Make time for one thing.</Link></footer>
    </div>
  )
}
