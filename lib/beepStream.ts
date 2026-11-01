/** Parse UTF-8 JSON events across arbitrary network chunk boundaries. */
export async function* beepStreamEvents(body: ReadableStream<Uint8Array>, sse = false): AsyncGenerator<{ type?: string; delta?: string; error?: unknown; done?: boolean; conversationId?: string; revision?: number }> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let data: string[] = []
  const parse = (line: string) => {
    if (!line || line === '[DONE]') return null
    return JSON.parse(line) as { type?: string; delta?: string; error?: unknown; done?: boolean; conversationId?: string; revision?: number }
  }
  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      if (buffer.length > 256_000) throw new Error('Stream event too large')
      let end: number
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end).replace(/\r$/, '')
        buffer = buffer.slice(end + 1)
        if (!sse) {
          const event = parse(line)
          if (event) yield event
        } else if (line.startsWith('data:')) {
          data.push(line.slice(5).trimStart())
        } else if (!line && data.length) {
          const event = parse(data.join('\n'))
          data = []
          if (event) yield event
        }
      }
      if (done) {
        if (sse && buffer.startsWith('data:')) data.push(buffer.slice(5).trimStart())
        const event = parse(sse ? data.join('\n') : buffer)
        if (event) yield event
        break
      }
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
