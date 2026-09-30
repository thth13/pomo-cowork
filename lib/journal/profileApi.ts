import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { body, text, url, requireUser, JournalError, publicAuthor, pageNumber } from './server'
import { publicUsername, validUsername } from './validation'
import { isUsernameTaken } from '@/lib/username'
export async function profileApi(request: NextRequest) {
  const user = await requireUser(request)
  if (request.method === 'GET') {
    return NextResponse.json(await prisma.user.findUnique({
      where: {
        id: user.id
      },
      select: {
        ...publicAuthor,
        description: true,
        location: true,
        websiteUrl: true,
        githubUrl: true,
        twitterUrl: true
      }
    }))
  }
  const data = await body(request)
  const username = publicUsername(text(data, 'username', 30, true))
  if (!validUsername(username)) throw new JournalError('Use 3–30 lowercase letters, numbers, dashes or underscores. This name must not be reserved.', 400, 'username')
  if (await isUsernameTaken(username, user.id)) throw new JournalError('Username is already taken.', 409, 'username')
  const result = await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      username,
      displayName: text(data, 'displayName', 80) || null,
      description: text(data, 'description', 500) || null,
      location: text(data, 'location', 100) || null,
      websiteUrl: url(data, 'websiteUrl'),
      githubUrl: url(data, 'githubUrl'),
      twitterUrl: url(data, 'twitterUrl')
    },
    select: publicAuthor
  })
  return NextResponse.json(result)
}
export async function discoverApi(request: NextRequest) {
  const page = pageNumber(request.nextUrl.searchParams.get('page'))
  const users = await prisma.user.findMany({
    where: {
      isAnonymous: false,
      projects: {
        some: {
          visibility: 'PUBLIC'
        }
      }
    },
    select: {
      ...publicAuthor,
      description: true,
      _count: {
        select: {
          followers: true
        }
      }
    },
    orderBy: [{
      createdAt: 'desc'
    }, {
      id: 'desc'
    }],
    take: 21,
    skip: (page - 1) * 20
  })
  return NextResponse.json({
    items: users.slice(0, 20),
    hasMore: users.length > 20
  })
}
export async function followApi(request: NextRequest, id: string) {
  const user = await requireUser(request)
  if (user.id === id) throw new JournalError('You cannot follow yourself.')
  const target = await prisma.user.findFirst({
    where: {
      id,
      isAnonymous: false
    },
    select: {
      id: true
    }
  })
  if (!target) throw new JournalError('Profile not found.', 404)
  if (request.method === 'PUT') await prisma.follow.upsert({
    where: {
      followerId_followingId: {
        followerId: user.id,
        followingId: id
      }
    },
    create: {
      followerId: user.id,
      followingId: id
    },
    update: {}
  })
  if (request.method === 'DELETE') await prisma.follow.deleteMany({
    where: {
      followerId: user.id,
      followingId: id
    }
  })
  const following = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: user.id,
        followingId: id
      }
    }
  })
  return NextResponse.json({
    following: Boolean(following),
    count: await prisma.follow.count({
      where: {
        followingId: id
      }
    })
  })
}
