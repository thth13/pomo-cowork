import type { MetadataRoute } from 'next'
import { getBlogPosts, postUrl, SITE_URL } from '@/lib/blog'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getBlogPosts()
  return [
    { url: SITE_URL },
    { url: `${SITE_URL}/blog`, ...(posts.length ? { lastModified: posts.reduce((latest, post) => post.updated > latest ? post.updated : latest, posts[0].updated) } : {}) },
    { url: `${SITE_URL}/pricing` },
    ...posts.map((post) => ({ url: postUrl(post.slug), lastModified: post.updated })),
  ]
}
