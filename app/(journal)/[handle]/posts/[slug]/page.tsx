import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { publicPost, json } from '@/lib/journal/server'
import { postInclude } from '@/lib/journal/queries'
import { journalMetadata } from '@/lib/journal/metadata'
import { Post, profileHref } from '@/lib/journal/types'
import { UpdateCard } from '@/components/journal/Cards'
export const dynamic = 'force-dynamic'
type Props = {
  params: {
    handle: string;
    slug: string;
  };
};
async function load(params: Props['params']) {
  if (!params.handle.startsWith('@')) return null
  return prisma.journalPost.findFirst({
    where: {
      slug: params.slug,
      author: {
        username: {
          equals: params.handle.slice(1),
          mode: 'insensitive'
        },
        isAnonymous: false
      },
      ...publicPost
    },
    include: postInclude
  })
}
export async function generateMetadata({
  params
}: Props) {
  const post = await load(params)
  return post ? journalMetadata(`${post.title || 'Update'} by ${post.author.displayName || post.author.username} | Pomo Cowork`, post.content.slice(0, 155), `${profileHref(post.author.username)}/posts/${post.slug}`, 'article') : {
    robots: {
      index: false
    }
  }
}
export default async function PostPage({
  params
}: Props) {
  const post = await load(params)
  if (!post) notFound()
  return <>
  <Link href={`${profileHref(post.author.username)}?tab=updates`}>← All updates</Link>
  <h1>{post.title || 'Project update'}</h1>
  <UpdateCard full post={((json(post) as unknown) as Post)} />
  </>
}
