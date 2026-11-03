/** Routes belonging to the project-blog section rather than the timer workspace. */
export function isProjectBlogRoute(pathname: string) {
  return /^\/(?:projects\/|@[^/]+(?:\/|$)|feed(?:\/|$)|discover(?:\/|$)|journal(?:\/|$)|settings\/profile(?:\/|$))/.test(pathname)
}
