/** Google tracking is enabled only in production on a non-local browser host. */
export function canUseGoogleTracking(): boolean {
  if (process.env.NODE_ENV !== 'production' || typeof window === 'undefined') return false

  const hostname = window.location.hostname.toLowerCase().replace(/\.$/, '')
  return hostname !== 'localhost'
    && !hostname.endsWith('.localhost')
    && !hostname.endsWith('.local')
    && !/^127\./.test(hostname)
    && hostname !== '0.0.0.0'
    && hostname !== '[::1]'
    && hostname !== '::1'
}
