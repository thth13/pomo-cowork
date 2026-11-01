import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { beepHistory, type BeepMessage } from '@/lib/beepChat'

export const isBeepId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
export class BeepConversationError extends Error {
  constructor(public status: number, public code: string) { super(code) }
}

export async function beginBeepTurn(input: {
  userId: string; conversationId: string; requestId: string; revision: number; content: string; greeting?: string
}) {
  return prisma.$transaction(async tx => {
    const conversation = await tx.beepConversation.upsert({
      where: { id: input.conversationId }, update: {},
      create: { id: input.conversationId, userId: input.userId, title: input.content.replace(/\s+/g, ' ').slice(0, 100), greeting: input.greeting?.slice(0, 500) || null },
    })
    if (conversation.userId !== input.userId) throw new BeepConversationError(404, 'not_found')
    const existing = await tx.beepTurn.findUnique({ where: { id: input.requestId } })
    if (existing && (existing.conversationId !== input.conversationId || existing.userText !== input.content)) throw new BeepConversationError(409, 'conflict')
    const latest = await tx.beepTurn.findFirst({ where: { conversationId: conversation.id }, orderBy: { sequence: 'desc' } })
    if (existing?.status === 'completed') return { conversationId: conversation.id, revision: conversation.revision, replay: existing.assistantText, messages: [] as BeepMessage[] }
    const now = new Date()
    if (conversation.revision !== input.revision || existing && latest?.id !== existing.id) throw new BeepConversationError(409, 'conflict')
    const acquired = await tx.beepConversation.updateMany({ where: {
      id: conversation.id, userId: input.userId, revision: input.revision,
      OR: [{ activeUntil: null }, { activeUntil: { lte: now } }],
    }, data: { revision: { increment: 1 }, activeRequestId: input.requestId, activeUntil: new Date(now.getTime() + 60_000), updatedAt: now } })
    if (!acquired.count) throw new BeepConversationError(409, 'conflict')
    await tx.beepTurn.updateMany({ where: { conversationId: conversation.id, status: 'pending' }, data: { status: 'interrupted' } })
    if (existing) await tx.beepTurn.update({ where: { id: existing.id }, data: { assistantText: '', status: 'pending' } })
    else await tx.beepTurn.create({ data: { id: input.requestId, conversationId: conversation.id, sequence: (latest?.sequence ?? 0) + 1, userText: input.content } })
    const turns = await tx.beepTurn.findMany({ where: { conversationId: conversation.id }, orderBy: { sequence: 'desc' }, take: 8 })
    const messages: BeepMessage[] = turns.reverse().flatMap(turn => [
      { role: 'user', content: turn.userText } as BeepMessage,
      ...(turn.assistantText ? [{ role: 'assistant', content: turn.assistantText } as BeepMessage] : []),
    ])
    if (conversation.greeting) messages.unshift({ role: 'assistant', content: conversation.greeting })
    return { conversationId: conversation.id, revision: conversation.revision + 1, replay: undefined, messages: beepHistory(messages) }
  })
}

export async function finishBeepTurn(conversationId: string, requestId: string, revision: number, answer: string, completed: boolean) {
  await prisma.$transaction(async tx => {
    const released = await tx.beepConversation.updateMany({ where: { id: conversationId, activeRequestId: requestId, revision },
      data: { activeRequestId: null, activeUntil: null, updatedAt: new Date() } })
    if (!released.count) throw new BeepConversationError(409, 'conflict')
    await tx.beepTurn.update({ where: { id: requestId }, data: {
      assistantText: answer.slice(0, 5000), status: completed ? 'completed' : answer ? 'interrupted' : 'failed',
    } })
  })
}

export const beepConversationSelect = {
  id: true, title: true, revision: true, createdAt: true, updatedAt: true,
} satisfies Prisma.BeepConversationSelect

export async function checkpointBeepTurn(conversationId: string, requestId: string, revision: number, answer: string) {
  const updated = await prisma.beepTurn.updateMany({ where: { id: requestId, conversationId,
    conversation: { activeRequestId: requestId, revision },
  }, data: { assistantText: answer.slice(0, 5000) } })
  if (!updated.count) throw new BeepConversationError(409, 'conflict')
}
