export function homeHref(language: string) {
  return language === 'es' ? '/es' : '/'
}

/** For event-driven navigation, read the active language at the moment of navigation. */
export function currentHomeHref() {
  return homeHref(document.documentElement.lang)
}
