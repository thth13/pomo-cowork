import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import JsonLd from '@/components/blog/JsonLd'
import { SITE_URL, blogCopy, formatPostDate, getBlogPost, getBlogPosts, postUrl, renderMarkdown } from '@/lib/blog'

type Props = { params: { slug: string } }
export const dynamic = 'force-static'
export const dynamicParams = false

export async function generateStaticParams() {
  return (await getBlogPosts()).map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getBlogPost(params.slug)
  if (!post) notFound()
  return {
    title: `${post.title} | Pomo Cowork`,
    description: post.description,
    authors: [{ name: post.author }],
    alternates: { canonical: postUrl(post.slug) },
    openGraph: {
      type: 'article', title: post.title, description: post.description, url: postUrl(post.slug), siteName: 'Pomo Cowork',
      publishedTime: post.date, modifiedTime: post.updated, authors: [post.author], section: post.category,
      locale: { en: 'en_US', es: 'es_ES', ru: 'ru_RU', uk: 'uk_UA' }[post.language],
      images: [{ url: '/assets/meta/og-main.png', width: 1200, height: 630, alt: 'Pomo Cowork' }],
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description, images: ['/assets/meta/og-main.png'] },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getBlogPost(params.slug)
  if (!post) notFound()
  const content = await renderMarkdown(post.content)
  const copy = blogCopy[post.language]
  const related = (await getBlogPosts()).filter((item) => item.slug !== post.slug && item.language === post.language).slice(0, 3)
  return (
    <main id="blog-content" className="blog-main blog-article-main" lang={post.language}>
      <JsonLd data={{
        '@context': 'https://schema.org', '@graph': [
          { '@type': 'BlogPosting', '@id': postUrl(post.slug), headline: post.title, description: post.description, datePublished: `${post.date}T00:00:00Z`, dateModified: `${post.updated}T00:00:00Z`, inLanguage: post.language, image: `${SITE_URL}/assets/meta/og-main.png`, author: { '@type': post.authorType, name: post.author }, publisher: { '@type': 'Organization', name: 'Pomo Cowork', url: SITE_URL }, mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl(post.slug) } },
          { '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: copy.home, item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: copy.blog, item: `${SITE_URL}/blog` },
            { '@type': 'ListItem', position: 3, name: post.title, item: postUrl(post.slug) },
          ] },
        ],
      }} />
      <nav className="blog-breadcrumbs" aria-label={copy.back}><Link href="/">{copy.home}</Link><span aria-hidden="true">/</span><Link href="/blog">{copy.blog}</Link><span aria-hidden="true">/</span><span aria-current="page">{post.title}</span></nav>
      <article>
        <header className="blog-article-header">
          <p className="blog-eyebrow">{post.category}</p>
          <h1>{post.title}</h1>
          <p className="blog-deck">{post.description}</p>
          <p className="blog-meta">{post.author} · <time dateTime={post.date}>{formatPostDate(post.date, post.language)}</time> · {post.minutes} {copy.minutes}</p>
          {post.updated !== post.date && <p className="blog-meta">{copy.updated}: <time dateTime={post.updated}>{formatPostDate(post.updated, post.language)}</time></p>}
        </header>
        <div className="blog-prose" dangerouslySetInnerHTML={{ __html: content }} />
      </article>
      <aside className="blog-cta"><h2>{copy.cta}</h2><p>{copy.intro}</p><Link href="/">{copy.start} <span aria-hidden="true">→</span></Link></aside>
      {related.length > 0 && <section className="blog-related"><h2>{copy.related}</h2><ul>{related.map((item) => <li key={item.slug}><Link href={`/blog/${item.slug}`}>{item.title}</Link></li>)}</ul></section>}
      <Link className="blog-back" href="/blog">← {copy.back}</Link>
    </main>
  )
}
