import type { VisitorDetails } from '@/lib/visitorDetails'

const yesNo = (value: boolean | null) => value === null ? null : value ? 'Yes' : 'No'
const dimensions = (width: number | null, height: number | null) =>
  width !== null && height !== null ? `${width} × ${height} CSS px` : null

export default function AdminVisitorDetails({ details }: { details: VisitorDetails | null }) {
  if (!details) return <span className="admin-data-note">Not recorded</span>
  const entries: [string, string | number | null][] = [
    ['Browser', [details.browser, details.browserVersion].filter(Boolean).join(' ') || null],
    ['Operating system', [details.os, details.osVersion].filter(Boolean).join(' ') || null],
    ['Device type', details.deviceType], ['Language', details.language],
    ['Preferred languages', details.languages.join(', ') || null], ['Timezone', details.timezone],
    ['Screen', dimensions(details.screenWidth, details.screenHeight)],
    ['Browser viewport', dimensions(details.viewportWidth, details.viewportHeight)],
    ['Pixel ratio', details.pixelRatio], ['Color depth (bits)', details.colorDepth],
    ['Maximum touch points', details.touchPoints], ['Reported logical processors', details.cpuCores],
    ['Approx. device memory (GB)', details.deviceMemoryGb], ['Estimated connection class', details.connectionType],
    ['Data saver', yesNo(details.saveData)], ['Cookies enabled', yesNo(details.cookieEnabled)],
    ['Do Not Track', details.doNotTrack === '1' ? 'Requested' : details.doNotTrack === '0' ? 'Not requested' : null],
    ['Global Privacy Control', yesNo(details.globalPrivacyControl)],
    ['Preferred color scheme', details.colorScheme], ['Prefers reduced motion', yesNo(details.reducedMotion)],
    ['Referrer (without query)', details.referrer], ['User agent', details.userAgent],
  ]
  return <details className="admin-record-details">
    <summary>Visitor details</summary>
    <dl>{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}</dl>
  </details>
}
