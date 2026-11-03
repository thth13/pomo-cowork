export type VisitorDetails = {
  browser: string | null
  browserVersion: string | null
  os: string | null
  osVersion: string | null
  deviceType: string | null
  userAgent: string | null
  referrer: string | null
  language: string | null
  languages: string[]
  timezone: string | null
  screenWidth: number | null
  screenHeight: number | null
  viewportWidth: number | null
  viewportHeight: number | null
  pixelRatio: number | null
  colorDepth: number | null
  touchPoints: number | null
  cpuCores: number | null
  deviceMemoryGb: number | null
  connectionType: string | null
  saveData: boolean | null
  cookieEnabled: boolean | null
  doNotTrack: string | null
  globalPrivacyControl: boolean | null
  colorScheme: string | null
  reducedMotion: boolean | null
}

const text = (value: unknown, limit = 100): string | null =>
  typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit) || null : null
const number = (value: unknown, max: number): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max ? value : null
const integer = (value: unknown, max: number): number | null =>
  typeof value === 'number' && Number.isInteger(value) ? number(value, max) : null
const boolean = (value: unknown): boolean | null => typeof value === 'boolean' ? value : null

function referrer(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 8192) return null
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    // Exclude credentials, query strings and fragments, which may contain tokens.
    return `${url.origin}${url.pathname}`.slice(0, 500)
  } catch { return null }
}

function software(ua: string, rules: [string, RegExp][]) {
  for (const [name, pattern] of rules) {
    const match = ua.match(pattern)
    if (match) return { name, version: match[1]?.replace(/_/g, '.') ?? null }
  }
  return { name: null, version: null }
}

// These are reported/estimated capabilities, not verified identity or exact hardware.
export function buildVisitorDetails(request: Request, input: unknown): VisitorDetails {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {}
  const userAgent = text(request.headers.get('user-agent'), 1024)
  const ua = userAgent ?? ''
  const browser = software(ua, [
    ['Googlebot', /Googlebot\/([\d.]+)/i], ['Bingbot', /bingbot\/([\d.]+)/i],
    ['Edge', /(?:Edg|EdgA|EdgiOS)\/([\d.]+)/], ['Opera', /(?:OPR|OPiOS)\/([\d.]+)/],
    ['Samsung Internet', /SamsungBrowser\/([\d.]+)/], ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
    ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/], ['Chromium', /Chromium\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+).*Safari/],
  ])
  // Low-entropy Client Hints can identify a Chromium brand hidden by the reduced UA.
  const brands = request.headers.get('sec-ch-ua') ?? ''
  if (!browser.name || ['Chrome', 'Chromium'].includes(browser.name)) {
    for (const [name, brand] of [['Edge', 'Microsoft Edge'], ['Opera', 'Opera'], ['Brave', 'Brave'], ['Chrome', 'Google Chrome'], ['Chromium', 'Chromium']]) {
      const match = brands.match(new RegExp(`"${brand}";v="([\\d.]+)"`))
      if (match) {
        // Keep the UA's fuller version when its detected brand already matches.
        if (browser.name !== name) { browser.name = name; browser.version = match[1] }
        break
      }
    }
  }
  const os = software(ua, [
    ['Windows', /Windows (NT [\d.]+)/], ['Android', /Android[ /]([\d.]+)/],
    ['iOS', /(?:CPU(?: iPhone)? OS|iPhone OS) ([\d_]+)/], ['Chrome OS', /CrOS \S+ ([\d.]+)/],
    ['macOS', /Mac OS X[ /]([\d_]+)/], ['Linux', /Linux/],
  ])
  const touchPoints = integer(raw.touchPoints, 100)
  const ipad = /iPad/.test(ua) || (os.name === 'macOS' && touchPoints !== null && touchPoints > 1)
  if (ipad) { os.name = 'iPadOS'; if (/Macintosh/.test(ua)) os.version = null }
  const mobileHint = request.headers.get('sec-ch-ua-mobile')
  const deviceType = /bot|crawler|spider/i.test(ua) ? 'Bot / crawler'
    : ipad || /Tablet|PlayBook|Silk/i.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) ? 'Tablet'
    : mobileHint === '?1' || /Mobile|iPhone|iPod|Windows Phone/i.test(ua) ? 'Mobile'
    : os.name || mobileHint === '?0' ? 'Desktop' : null
  let timezone = text(raw.timezone, 90)
  if (timezone) {
    try { new Intl.DateTimeFormat('en', { timeZone: timezone }) } catch { timezone = null }
  }
  return {
    browser: browser.name, browserVersion: browser.version, os: os.name, osVersion: os.version,
    deviceType, userAgent, referrer: referrer(raw.referrer),
    language: text(raw.language, 35) ?? text(request.headers.get('accept-language')?.split(',')[0], 35),
    languages: Array.isArray(raw.languages) ? raw.languages.slice(0, 10).map(value => text(value, 35)).filter((value): value is string => value !== null) : [],
    timezone, screenWidth: integer(raw.screenWidth, 100000), screenHeight: integer(raw.screenHeight, 100000),
    viewportWidth: integer(raw.viewportWidth, 100000), viewportHeight: integer(raw.viewportHeight, 100000),
    pixelRatio: number(raw.pixelRatio, 20), colorDepth: integer(raw.colorDepth, 128), touchPoints,
    cpuCores: integer(raw.cpuCores, 1024), deviceMemoryGb: number(raw.deviceMemoryGb, 1024),
    connectionType: ['slow-2g', '2g', '3g', '4g'].includes(String(raw.connectionType)) ? String(raw.connectionType) : null,
    saveData: boolean(raw.saveData), cookieEnabled: boolean(raw.cookieEnabled),
    doNotTrack: ['1', '0', 'unspecified'].includes(String(raw.doNotTrack)) ? String(raw.doNotTrack) : null,
    globalPrivacyControl: boolean(raw.globalPrivacyControl),
    colorScheme: ['light', 'dark'].includes(String(raw.colorScheme)) ? String(raw.colorScheme) : null,
    reducedMotion: boolean(raw.reducedMotion),
  }
}
