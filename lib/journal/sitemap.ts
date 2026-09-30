import 'server-only'
import { prisma } from '@/lib/db'
import { publicPost } from './server'
import { profileHref } from './types'

// Bound the MVP sitemap to 30,000 journal URLs. Older content remains linked through
// public pagination; split into sitemap shards before this collection outgrows the cap.
export async function journalSitemap(siteUrl: string) {
  const [users, projects, posts] = await Promise.all([
    prisma.user.findMany({
      where: { isAnonymous: false, OR: [{ projects: { some: { visibility: 'PUBLIC' } } }, { journalPosts: { some: publicPost } }] },
      select: { username: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 10000,
    }),
    prisma.project.findMany({
      where: { visibility: 'PUBLIC', user: { isAnonymous: false } },
      select: { slug: true, updatedAt: true, user: { select: { username: true } } },
      orderBy: { updatedAt: 'desc' }, take: 10000,
    }),
    prisma.journalPost.findMany({
      where: { ...publicPost, author: { isAnonymous: false } },
      select: { slug: true, updatedAt: true, author: { select: { username: true } } },
      orderBy: { updatedAt: 'desc' }, take: 10000,
    }),
  ])
  return [
    ...users.map(user => ({ url: `${siteUrl}${profileHref(user.username)}`, lastModified: user.updatedAt })),
    ...projects.map(project => ({ url: `${siteUrl}${profileHref(project.user.username)}/projects/${project.slug}`, lastModified: project.updatedAt })),
    ...posts.map(post => ({ url: `${siteUrl}${profileHref(post.author.username)}/posts/${post.slug}`, lastModified: post.updatedAt })),
  ]
}
