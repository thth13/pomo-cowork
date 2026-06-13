import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ensureAnonymousUser } from '@/lib/anonymousServer'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { isValidAnonymousId } from '@/lib/anonymousProfile'

const ANONYMOUS_ID_HEADER = 'x-anonymous-id'

interface ResolveTaskUserOptions {
  createAnonymous?: boolean
}

export const resolveTaskUserId = async (
  request: NextRequest,
  options: ResolveTaskUserOptions = {}
): Promise<string | null> => {
  const token = getTokenFromHeader(request.headers.get('authorization'))

  if (token) {
    const payload = verifyToken(token)
    if (payload) {
      const authenticatedUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true },
      })

      if (authenticatedUser) {
        return authenticatedUser.id
      }
    }
  }

  const anonymousId = request.headers.get(ANONYMOUS_ID_HEADER)?.trim()
  if (!isValidAnonymousId(anonymousId)) {
    return null
  }

  if (options.createAnonymous) {
    const anonymousUser = await ensureAnonymousUser(prisma, anonymousId)
    return anonymousUser?.id ?? null
  }

  const anonymousUser = await prisma.user.findFirst({
    where: {
      id: anonymousId,
      isAnonymous: true,
    },
    select: { id: true },
  })

  return anonymousUser?.id ?? null
}
