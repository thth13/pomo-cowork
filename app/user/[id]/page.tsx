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
  const findUser = async (identifier: string) => await prisma.user.findFirst({
    where: { username: { equals: identifier, mode: 'insensitive' }, isAnonymous: false },
    select,
  }) ?? await prisma.user.findUnique({ where: { id: identifier }, select })

  let identifier = params.id
  let user = await findUser(identifier)

  // Next can pass an encoded segment to server pages. Try the literal value
  // first so existing usernames containing percent signs remain accessible.
  if (!user) {
    let decodedIdentifier = identifier
    try {
      decodedIdentifier = decodeURIComponent(identifier)
    } catch {
      // A literal percent sign in a username is not necessarily URL encoding.
    }
    if (decodedIdentifier !== identifier) {
      identifier = decodedIdentifier
      user = await findUser(identifier)
    }
  }

  if (!user) notFound()

  if (!user.isAnonymous && identifier !== user.username) {
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
