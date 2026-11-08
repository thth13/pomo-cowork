import type { MetadataRoute } from 'next'
import { getBlogPosts, postUrl, SITE_URL } from '@/lib/blog'
import { journalSitemap } from '@/lib/journal/sitemap'
import { HOME_LANGUAGES } from '@/lib/homeSeo'
import { localizedSeoPaths, seoSlugs } from '@/lib/seoRoutes'
import { plannerSlugs } from '@/lib/plannerPages'

// Next.js serves this metadata route as /sitemap.xml. Keep one generated sitemap
// so published blog posts and the shared tool registry cannot fall out of sync.
export const dynamic = 'force-dynamic'

const publicPages = ['/pricing', '/rooms', '/leaderboard', '/privacy', '/terms', '/refund']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, journalEntries] = await Promise.all([getBlogPosts(), journalSitemap(SITE_URL)])
  return [
    ...journalEntries,
    ...['/', '/es'].map((path) => ({
      url: `${SITE_URL}${path === '/' ? '' : path}`,
      alternates: { languages: Object.fromEntries(Object.entries(HOME_LANGUAGES).map(([language, href]) => [language, `${SITE_URL}${href === '/' ? '' : href}`])) },
    })),
    ...publicPages.map((path) => ({ url: `${SITE_URL}${path}` })),
    { url: `${SITE_URL}/blog`, ...(posts.length ? { lastModified: posts.reduce((latest, post) => post.updated > latest ? post.updated : latest, posts[0].updated) } : {}) },
    ...seoSlugs.map((slug) => {
      const paths = localizedSeoPaths[slug]
      return {
        url: `${SITE_URL}/${slug}`,
        ...(paths ? { alternates: { languages: Object.fromEntries(Object.entries(paths).map(([language, path]) => [language, `${SITE_URL}${path}`])) } } : {}),
      }
    }),
    ...Object.values(localizedSeoPaths).flatMap((paths) => paths ? [{
      url: `${SITE_URL}${paths.es}`,
      alternates: { languages: Object.fromEntries(Object.entries(paths).map(([language, path]) => [language, `${SITE_URL}${path}`])) },
    }] : []),
    ...plannerSlugs.map((slug) => ({ url: `${SITE_URL}/${slug}` })),
    ...posts.map((post) => ({ url: postUrl(post.slug), lastModified: post.updated })),
  ]
}
