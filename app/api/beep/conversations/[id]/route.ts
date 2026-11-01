import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { beepAccount, beepJson } from '@/lib/beepApi'
import { beepConversationSelect, isBeepId } from '@/lib/beepConversations'
import type { BeepMessage } from '@/lib/beepChat'

export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await beepAccount(request)
    if (!user) return beepJson({ error: 'unauthorized' }, 401)
    if (!isBeepId(params.id)) return beepJson({ error: 'not_found' }, 404)
    const beforeValue = request.nextUrl.searchParams.get('before')
    const before = beforeValue === null ? null : Number(beforeValue)
    if (before !== null && (!Number.isSafeInteger(before) || before < 1)) return beepJson({ error: 'invalid_request' }, 400)
    const conversation = await prisma.beepConversation.findFirst({ where: { id: params.id, userId: user.id }, select: {
      ...beepConversationSelect, greeting: true, activeUntil: true,
      turns: { where: before === null ? {} : { sequence: { lt: before } }, orderBy: { sequence: 'desc' }, take: 31 },
    } })
    if (!conversation) return beepJson({ error: 'not_found' }, 404)
    const more = conversation.turns.length > 30
    const turns = conversation.turns.slice(0, 30).reverse()
    const messages: BeepMessage[] = turns.flatMap(turn => {
      const status = turn.status === 'pending' && (!conversation.activeUntil || conversation.activeUntil <= new Date()) ? 'interrupted' : turn.status
      return [
        { role: 'user', content: turn.userText, requestId: turn.id, status } as BeepMessage,
        ...(turn.assistantText ? [{ role: 'assistant', content: turn.assistantText, requestId: turn.id, status } as BeepMessage] : []),
      ]
    })
    if (!more && conversation.greeting) messages.unshift({ role: 'assistant', content: conversation.greeting })
    return beepJson({ conversation: { id: conversation.id, title: conversation.title, revision: conversation.revision }, messages,
      nextBefore: more ? turns[0].sequence : null, active: Boolean(conversation.activeUntil && conversation.activeUntil > new Date()) })
  } catch { return beepJson({ error: 'unavailable' }, 503) }
}
