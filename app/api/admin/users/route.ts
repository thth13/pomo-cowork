import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdmin } from '@/lib/adminRequest'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request)
    if (denied) return denied
    const id = request.nextUrl.searchParams.get('id')
    if (!id || id.length > 128) {
      return NextResponse.json({ error: 'A valid user ID is required.' }, { status: 400 })
    }
    // Keep the anonymous guard in the mutation so concurrent registration is protected.
    // Related records follow the cascade / set-null policies in the Prisma schema.
    const result = await prisma.user.deleteMany({ where: { id, isAnonymous: true } })
    if (!result.count && await prisma.user.findUnique({ where: { id }, select: { id: true } })) {
      return NextResponse.json({ error: 'Registered accounts cannot be deleted here.' }, { status: 409 })
    }
    // Already deleted accounts succeed too, allowing safe retries after a timeout.
    return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Admin anonymous user deletion failed:', error)
    return NextResponse.json({ error: 'Could not delete anonymous user. Please retry.' }, { status: 500 })
  }
}
