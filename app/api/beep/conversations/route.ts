import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { beepAccount, beepJson } from '@/lib/beepApi'
import { beepConversationSelect, isBeepId } from '@/lib/beepConversations'

export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  try {
    const user = await beepAccount(request)
    if (!user) return beepJson({ error: 'unauthorized' }, 401)
    const cursor = request.nextUrl.searchParams.get('cursor')
    let anchor: { id: string; updatedAt: Date } | null = null
    if (cursor) {
      if (cursor.length > 100) return beepJson({ error: 'invalid_request' }, 400)
      const [timestamp, id] = cursor.split('|')
      const updatedAt = new Date(timestamp)
      if (!isBeepId(id) || !Number.isFinite(updatedAt.getTime())) return beepJson({ error: 'invalid_request' }, 400)
      anchor = { id, updatedAt }
    }
    const conversations = await prisma.beepConversation.findMany({ where: { userId: user.id, ...(anchor ? {
      OR: [{ updatedAt: { lt: anchor.updatedAt } }, { updatedAt: anchor.updatedAt, id: { lt: anchor.id } }],
    } : {}) }, select: beepConversationSelect, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 31 })
    return beepJson({ conversations: conversations.slice(0, 30), nextCursor: conversations.length > 30 ? `${conversations[29].updatedAt.toISOString()}|${conversations[29].id}` : null })
  } catch { return beepJson({ error: 'unavailable' }, 503) }
}
