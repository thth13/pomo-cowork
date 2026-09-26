import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowDown, ArrowUpRight, BookOpen, Clock3 } from 'lucide-react'
import { BLOG_DESCRIPTION, SITE_URL, blogCopy, formatPostDate, getBlogPosts, postUrl } from '@/lib/blog'
import JsonLd from '@/components/blog/JsonLd'

export const dynamic = 'force-static'
export const metadata: Metadata = {
  title: 'Pomodoro & Focus Blog | Pomo Cowork',
  description: BLOG_DESCRIPTION,
  alternates: { canonical: '/blog' },
  openGraph: { title: 'Pomodoro & Focus Blog | Pomo Cowork', description: BLOG_DESCRIPTION, url: '/blog', type: 'website', siteName: 'Pomo Cowork', locale: 'en_US', images: ['/assets/meta/og-main.png'] },
  twitter: { card: 'summary_large_image', title: 'Pomodoro & Focus Blog | Pomo Cowork', description: BLOG_DESCRIPTION, images: ['/assets/meta/og-main.png'] },
}

export default async function BlogPage() {
  const posts = await getBlogPosts()
  const [featured, ...otherPosts] = posts
  return (
    <main id="blog-content" className="blog-main blog-index">
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Blog', name: 'Pomo Cowork Blog', description: BLOG_DESCRIPTION, url: `${SITE_URL}/blog`, blogPost: posts.map((post) => ({ '@type': 'BlogPosting', headline: post.title, url: postUrl(post.slug), datePublished: post.date, inLanguage: post.language })) }} />
      <header className="blog-index-intro">
        <div>
          <p className="blog-eyebrow"><span aria-hidden="true" className="blog-pixel-mark" /> The Pomo notebook</p>
          <h1>Good work starts<br />with <span>a little focus.</span></h1>
        </div>
        <div className="blog-intro-note">
          <p>Small steps. Clearer days. Practical notes on finding your rhythm and making room for the work that matters.</p>
          <a href="#articles-heading">Explore the notebook <ArrowDown size={16} aria-hidden="true" /></a>
        </div>
      </header>
      <section className="blog-library" aria-labelledby="articles-heading">
        <div className="blog-library-heading">
          <h2 id="articles-heading"><BookOpen size={18} aria-hidden="true" /> The reading room</h2>
          <span>{posts.length} {posts.length === 1 ? 'article' : 'articles'} to explore</span>
        </div>
        {featured ? (
          <>
            <div className="blog-feature-layout">
              <article className="blog-feature" lang={featured.language}>
                <div className="blog-feature-top">
                  <span className="blog-category">{featured.category}</span>
                  <span className="blog-feature-label" lang="en">Latest in the notebook</span>
                </div>
                <h3><Link href={`/blog/${featured.slug}`}>{featured.title}<ArrowUpRight aria-hidden="true" /></Link></h3>
                <p className="blog-feature-description">{featured.description}</p>
                <div className="blog-feature-bottom blog-meta">
                  <span>{featured.author}<br /><time dateTime={featured.date}>{formatPostDate(featured.date, featured.language)}</time></span>
                  <span className="blog-reading-time"><Clock3 size={15} aria-hidden="true" />{featured.minutes} {blogCopy[featured.language].minutes}</span>
                </div>
              </article>
              <aside className="blog-session" aria-labelledby="blog-session-heading">
                <p className="blog-session-label">A little practice</p>
                <div className="blog-session-clock" aria-hidden="true">
                  <span className="blog-clock-caption">ONE THING AT A TIME</span>
                  <span className="blog-clock-digits">25:00</span>
                  <div className="blog-session-track"><i /><i /><i /><i /></div>
                  <span className="blog-clock-caption">FOCUS. BREAK. REPEAT.</span>
                </div>
                <h3 id="blog-session-heading">Find your next<br />25 minutes.</h3>
                <p>Pick one task. Settle in. Put a little of what you read into practice.</p>
                <Link href="/">Open the timer <ArrowUpRight size={18} aria-hidden="true" /></Link>
              </aside>
            </div>
            {otherPosts.length > 0 && (
              <div className="blog-article-grid">
                {otherPosts.map((post) => (
                  <article key={post.slug} className="blog-note" lang={post.language}>
                    <div className="blog-note-top"><span className="blog-category">{post.category}</span><BookOpen size={18} aria-hidden="true" /></div>
                    <h3><Link href={`/blog/${post.slug}`}>{post.title}<ArrowUpRight size={20} aria-hidden="true" /></Link></h3>
                    <p className="blog-note-description">{post.description}</p>
                    <div className="blog-note-bottom blog-meta"><time dateTime={post.date}>{formatPostDate(post.date, post.language)}</time><span>{post.minutes} {blogCopy[post.language].minutes}</span></div>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : <p className="blog-empty">Our first guide is on its way. <Link href="/">Start a focus session</Link> while you wait.</p>}
      </section>
    </main>
  )
}
