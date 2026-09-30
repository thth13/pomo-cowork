import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { body, text, requireUser, viewer, visiblePost, publicAuthor, publicPost, JournalError, pageNumber } from './server'
export async function reactionsApi(request: NextRequest, id: string) {
  const user = await requireUser(request)
  await visiblePost(id, user.id)
  if (request.method === 'PUT') await prisma.postReaction.upsert({
    where: {
      userId_postId: {
        userId: user.id,
        postId: id
      }
    },
    create: {
      userId: user.id,
      postId: id
    },
    update: {}
  })
  if (request.method === 'DELETE') await prisma.postReaction.deleteMany({
    where: {
      userId: user.id,
      postId: id
    }
  })
  return NextResponse.json({
    supported: Boolean(await prisma.postReaction.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId: id
        }
      }
    })),
    count: await prisma.postReaction.count({
      where: {
        postId: id
      }
    })
  })
}
export async function commentsApi(request: NextRequest, postId: string, commentId?: string) {
  const user = await viewer(request)
  await visiblePost(postId, user?.id)
  if (request.method === 'GET') {
    const page = pageNumber(request.nextUrl.searchParams.get('page'))
    const comments = await prisma.journalComment.findMany({
      where: {
        postId
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: publicAuthor
        }
      },
      orderBy: [{
        createdAt: 'asc'
      }, {
        id: 'asc'
      }],
      take: 21,
      skip: (page - 1) * 20
    })
    return NextResponse.json({
      items: comments.slice(0, 20),
      hasMore: comments.length > 20
    })
  }
  if (!user) throw new JournalError('Sign in to comment.', 401)
  if (request.method === 'DELETE' && commentId) {
    const result = await prisma.journalComment.deleteMany({
      where: {
        id: commentId,
        postId,
        authorId: user.id
      }
    })
    if (!result.count) throw new JournalError('Comment not found.', 404)
    return NextResponse.json({
      success: true
    })
  }
  const data = await body(request)
  const comment = await prisma.journalComment.create({
    data: {
      postId,
      authorId: user.id,
      content: text(data, 'content', 2000, true)
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: {
        select: publicAuthor
      }
    }
  })
  return NextResponse.json(comment)
}
export async function imagesApi(request: NextRequest, id?: string) {
  const user = await viewer(request)
  if (request.method === 'GET' && id) {
    const path = `/api/journal/images/${id}`
    const image = await prisma.journalImage.findUnique({
      where: {
        id
      }
    })
    if (!image) throw new JournalError('Image not found.', 404)
    if (image.userId !== user?.id) {
      const [post, project] = await Promise.all([prisma.journalPost.findFirst({
        where: {
          ...publicPost,
          images: {
            has: path
          }
        },
        select: {
          id: true
        }
      }), prisma.project.findFirst({
        where: {
          visibility: 'PUBLIC',
          imageUrl: path
        },
        select: {
          id: true
        }
      })])
      if (!post && !project) throw new JournalError('Image not found.', 404)
    }
    return new NextResponse(new Uint8Array(image.data), {
      headers: {
        'Content-Type': image.contentType,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  }
  if (!user) throw new JournalError('Sign in to upload an image.', 401)
  const form = await request.formData(),
    file = form.get('image')
  if (!(file instanceof File) || file.size > 2 * 1024 * 1024 || file.size === 0) throw new JournalError('Choose an image up to 2 MB.')
  const data = Buffer.from(await file.arrayBuffer())
  const detected = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png' : data[0] === 255 && data[1] === 216 && data[2] === 255 ? 'image/jpeg' : data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : null
  if (!detected) throw new JournalError('Choose a PNG, JPEG, or WebP image.')
  const count = await prisma.journalImage.count({
    where: {
      userId: user.id,
      createdAt: {
        gte: new Date(Date.now() - 86400000)
      }
    }
  })
  if (count >= 30) throw new JournalError('Daily upload limit reached. Try again tomorrow.', 429)
  const image = await prisma.journalImage.create({
    data: {
      userId: user.id,
      contentType: detected,
      data
    },
    select: {
      id: true
    }
  })
  return NextResponse.json({
    url: `/api/journal/images/${image.id}`
  })
}
