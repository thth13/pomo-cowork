import { NextRequest } from 'next/server'
import { authorizeAdmin } from '@/lib/adminRequest'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const denied = await authorizeAdmin(request)
  return denied ?? new Response(null, { status: 204 })
}
