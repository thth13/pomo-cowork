import Link from 'next/link'

export default function BlogNotFound() {
  return <main id="blog-content" className="blog-main blog-intro"><p className="blog-eyebrow">404</p><h1>Article not found</h1><p>This article is unavailable or the link has changed.</p><Link href="/blog">Back to all articles →</Link></main>
}
