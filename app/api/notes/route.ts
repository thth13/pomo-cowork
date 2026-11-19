import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { resolveTaskUserId } from '@/lib/taskAuth'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { fitsFreeNotesLimit, FREE_NOTES_LIMIT, isNotesCollection, type NotesSnapshot } from '@/lib/notes'
import { isValidAnonymousId } from '@/lib/anonymousProfile'
import { hasActiveProAccess } from '@/lib/proAccess'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers })

function serverError(error: unknown, operation: 'load' | 'save') {
  const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined
  // Never log the request body or Prisma's full error (which can contain notes).
  console.error(`Notes ${operation} failed`, { name: error instanceof Error ? error.name : 'UnknownError', code })
  return json({ error: `Could not ${operation} notes.`, code: code === 'P2021' ? 'NOTES_TABLE_MISSING' : 'NOTES_SERVER_ERROR' }, 500)
}

async function owner(request: NextRequest, create = false) {
  // Do not let an expired account session silently write to a guest collection.
  const auth = request.headers.get('authorization')
  if (auth && !verifyToken(getTokenFromHeader(auth) ?? '')) return null
  return resolveTaskUserId(request, create)
}

export async function GET(request: NextRequest) {
  try {
    const userId = await owner(request)
    if (!userId) {
      // First-time guests have no row until the first save, matching Projects.
      if (!request.headers.get('authorization')) {
        if (isValidAnonymousId(request.headers.get('x-anonymous-id'))) {
          return json({ notes: [], revision: 0, legacyImported: false })
        }
      }
      return json({ error: 'Unauthorized' }, 401)
    }
    // Parameterized SQL also works when dev hot reload retains the Prisma
    // module from before this table's model was generated.
    const [value] = await prisma.$queryRaw<NotesSnapshot[]>`
      SELECT "notes", "revision", "legacyImported"
      FROM "workspace_notes" WHERE "userId" = ${userId}
    `
    return json(value ?? { notes: [], revision: 0, legacyImported: false })
  } catch (error) {
    return serverError(error, 'load')
  }
}

export async function PUT(request: NextRequest) {
  // Bound JSON parsing as well as the stored collection (2 MB UTF-8).
  const reader = request.body?.getReader()
  if (!reader) return json({ error: 'Invalid notes.' }, 400)
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 2 * 1024 * 1024) {
        await reader.cancel()
        return json({ error: 'Notes are too large.' }, 413)
      }
      chunks.push(value)
    }
  } catch { return json({ error: 'Invalid notes.' }, 400) }
  let body
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return json({ error: 'Invalid notes.' }, 400) }
  if (!body || !Number.isSafeInteger(body.revision) || body.revision < 0 ||
    typeof body.legacyImported !== 'boolean' || !isNotesCollection(body.notes)) {
    return json({ error: 'Invalid notes.' }, 400)
  }
  const { notes, revision, legacyImported } = body
  try {
    const userId = await owner(request, true)
    if (!userId) return json({ error: 'Unauthorized' }, 401)
    if (notes.length > FREE_NOTES_LIMIT) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { isPro: true, proExpiresAt: true } })
      if (!hasActiveProAccess(user)) {
        const [saved] = await prisma.$queryRaw<Pick<NotesSnapshot, 'notes' | 'revision'>[]>`
          SELECT "notes", "revision" FROM "workspace_notes" WHERE "userId" = ${userId}
        `
        if (revision !== (saved?.revision ?? 0)) return json({ error: 'Notes changed in another window.' }, 409)
        if (!fitsFreeNotesLimit(notes, saved?.notes ?? [])) {
          return json({ error: 'The free plan allows one note.', code: 'FREE_NOTES_LIMIT' }, 403)
        }
      }
    }
    const notesJson = JSON.stringify(notes)
    const result = revision === 0
      ? await prisma.$queryRaw<{ revision: number }[]>`
          INSERT INTO "workspace_notes" ("userId", "notes", "revision", "legacyImported", "updatedAt")
          VALUES (${userId}, ${notesJson}::jsonb, 1, ${legacyImported}, CURRENT_TIMESTAMP)
          ON CONFLICT ("userId") DO NOTHING
          RETURNING "revision"
        `
      : await prisma.$queryRaw<{ revision: number }[]>`
          UPDATE "workspace_notes"
          SET "notes" = ${notesJson}::jsonb, "revision" = "revision" + 1,
              "legacyImported" = ${legacyImported}, "updatedAt" = CURRENT_TIMESTAMP
          WHERE "userId" = ${userId} AND "revision" = ${revision}
          RETURNING "revision"
        `
    if (!result.length) return json({ error: 'Notes changed in another window.' }, 409)
    return json({ revision: result[0].revision })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return json({ error: 'Notes changed in another window.' }, 409)
    }
    return serverError(error, 'save')
  }
}
