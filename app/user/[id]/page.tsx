import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { userProfileHref } from '@/lib/userProfile'
import UserProfilePage from '@/components/UserProfilePage'

export const dynamic = 'force-dynamic'

export default async function UserProfileRoute({ params, searchParams }: {
  params: { id: string }
  searchParams: Record<string, string | string[] | undefined>
}) {
  const select = { id: true, username: true, isAnonymous: true } as const
  const user = await prisma.user.findFirst({
    where: { username: { equals: params.id, mode: 'insensitive' }, isAnonymous: false },
    select,
  }) ?? await prisma.user.findUnique({ where: { id: params.id }, select })

  if (!user) notFound()

  if (!user.isAnonymous && params.id !== user.username) {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
      if (Array.isArray(value)) value.forEach(item => query.append(key, item))
      else if (value !== undefined) query.set(key, value)
    }
    const suffix = query.toString() ? `?${query.toString()}` : ''
    redirect(`${userProfileHref(user)}${suffix}`)
  }

  return <UserProfilePage key={user.id} userId={user.id} />
}
