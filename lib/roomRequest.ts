/** Bounded room requests; callers that manage cancellation retain their own signal. */
export async function roomRequest(url: string, options: RequestInit = {}) {
  if (options.signal) return fetch(url, options)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}
