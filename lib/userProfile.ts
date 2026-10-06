/** Public profile URLs use nicknames; guest profiles keep their internal IDs. */
export function userProfileHref(user: { id: string; username: string; isAnonymous?: boolean }) {
  const isAnonymous = user.isAnonymous ?? /^Guest(?:\s*#|-)/i.test(user.username)
  return `/user/${encodeURIComponent(isAnonymous ? user.id : user.username)}`
}
