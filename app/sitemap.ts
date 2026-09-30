import type { MetadataRoute } from 'next'
import { getBlogPosts, postUrl, SITE_URL } from '@/lib/blog'
import { journalSitemap } from '@/lib/journal/sitemap'
import { seoSlugs } from '@/lib/seoRoutes'

// Next.js serves this metadata route as /sitemap.xml. Keep one generated sitemap
// so published blog posts and the shared tool registry cannot fall out of sync.
export const dynamic = 'force-dynamic'

const publicPages = ['', '/pricing', '/rooms', '/leaderboard', '/privacy', '/terms', '/refund']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, journalEntries] = await Promise.all([getBlogPosts(), journalSitemap(SITE_URL)])
  return [
    ...journalEntries,
    ...publicPages.map((path) => ({ url: `${SITE_URL}${path}` })),
    { url: `${SITE_URL}/blog`, ...(posts.length ? { lastModified: posts.reduce((latest, post) => post.updated > latest ? post.updated : latest, posts[0].updated) } : {}) },
    ...seoSlugs.map((slug) => ({ url: `${SITE_URL}/${slug}` })),
    ...posts.map((post) => ({ url: postUrl(post.slug), lastModified: post.updated })),
  ]
}
