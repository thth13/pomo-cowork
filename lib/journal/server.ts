import 'server-only'
import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
export class JournalError extends Error {
  constructor(message: string, public status = 400, public field?: string) {
    super(message)
  }
}
export async function viewer(request: NextRequest) {
  const token = getTokenFromHeader(request.headers.get('authorization'))
  const payload = token ? verifyToken(token) : null
  if (!payload) return null
  return prisma.user.findFirst({
    where: {
      id: payload.userId,
      isAnonymous: false
    },
    select: {
      id: true,
      username: true
    }
  })
}
export async function requireUser(request: NextRequest) {
  const user = await viewer(request)
  if (!user) throw new JournalError('Sign in to continue.', 401)
  return user
}
export function failure(error: unknown) {
  if (error instanceof JournalError) return NextResponse.json({
    error: error.message,
    field: error.field
  }, {
    status: error.status
  })
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({
    error: 'That name or entry already exists. Choose another.'
  }, {
    status: 409
  })
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return NextResponse.json({
    error: 'This entry is no longer available.'
  }, {
    status: 404
  })
  if (error instanceof SyntaxError) return NextResponse.json({
    error: 'Invalid request.'
  }, {
    status: 400
  })
  console.error('Journal request failed', error)
  return NextResponse.json({
    error: 'Unable to save or load this request. Please try again.'
  }, {
    status: 500
  })
}
export async function body(request: NextRequest): Promise<Record<string, unknown>> {
  const value: unknown = await request.json()
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new JournalError('Invalid request.')
  return (value as Record<string, unknown>)
}
export function text(data: Record<string, unknown>, key: string, max: number, required = false) {
  const value = data[key] ?? ''
  if (typeof value !== 'string' || value.length > max || required && !value.trim()) throw new JournalError(`Check ${key} (maximum ${max} characters).`, 400, key)
  return value.trim()
}
export function flag(data: Record<string, unknown>, key: string) {
  if (data[key] !== undefined && typeof data[key] !== 'boolean') throw new JournalError(`Invalid ${key}.`, 400, key)
  return data[key] === true
}
export function choice<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || !values.includes((value as T))) throw new JournalError('Choose a valid option.')
  return (value as T)
}
export function url(data: Record<string, unknown>, key: string) {
  const value = text(data, key, 2048)
  if (!value) return null
  try {
    const parsed = new URL(value)
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error()
    return parsed.toString()
  } catch {
    throw new JournalError('Enter a complete http or https URL.', 400, key)
  }
}
export function date(value: unknown, fallback = new Date()) {
  if (value === undefined || value === '') return fallback
  if (typeof value !== 'string') throw new JournalError('Enter a valid date.')
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime()) || parsed > new Date()) throw new JournalError('Choose a valid date, no later than today.')
  return parsed
}
export const publicAuthor = ({
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true
} satisfies Prisma.UserSelect)
export const publicProject = {
  OR: [{
    projectId: null
  }, {
    project: {
      visibility: ('PUBLIC' as const)
    }
  }]
}
export const publicPost = {
  visibility: ('PUBLIC' as const),
  publishedAt: {
    not: null
  },
  ...publicProject
}
export function pageNumber(value: string | null | undefined) {
  return Math.min(10000, Math.max(1, Number.parseInt(value || '1', 10) || 1))
}
export async function ownProject(id: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id,
      userId
    }
  })
  if (!project) throw new JournalError('Project not found.', 404)
  return project
}
export async function visiblePost(id: string, userId?: string) {
  const post = await prisma.journalPost.findFirst({
    where: {
      id,
      OR: [{
        ...publicPost
      }, ...(userId ? [{
        authorId: userId
      }] : [])]
    }
  })
  if (!post) throw new JournalError('Update not found.', 404)
  return post
}
export async function ownedImages(value: unknown, userId: string) {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 4 || value.some(item => typeof item !== 'string')) throw new JournalError('Choose up to four images.')
  const urls = (value as string[])
  const ids = urls.map(item => /^\/api\/journal\/images\/([a-z0-9]+)$/.exec(item)?.[1])
  if (ids.some(id => !id)) throw new JournalError('Upload images using Add image.')
  const count = await prisma.journalImage.count({
    where: {
      id: {
        in: (ids as string[])
      },
      userId
    }
  })
  if (count !== new Set(ids).size) throw new JournalError('Image not found.', 400)
  return Array.from(new Set(urls))
}
export function json<T>(value: T): T {
  return (JSON.parse(JSON.stringify(value)) as T)
}
export function requestId(data: Record<string, unknown>) {
  const value = data.requestId
  if (value === undefined) return randomUUID()
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) throw new JournalError('Invalid request identifier.')
  return value
}
