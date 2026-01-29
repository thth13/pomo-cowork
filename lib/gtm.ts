import TagManager from 'react-gtm-module'

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID
let gtmInitialized = false

const canUseGtm = () => Boolean(GTM_ID) && process.env.NODE_ENV === 'production'

export const initGtm = () => {
  if (!canUseGtm() || gtmInitialized) return
  TagManager.initialize({ gtmId: GTM_ID as string })
  gtmInitialized = true
}

export const pushGtmEvent = (dataLayer: Record<string, unknown>) => {
  if (!canUseGtm()) return
  TagManager.dataLayer({ dataLayer })
}

export const reportConversion = () => {
  pushGtmEvent({
    event: 'conversion',
    send_to: 'AW-11075064387/-cWiCIOI_O0bEMOkgKEp',
    value: 15.0,
    currency: 'UAH',
  })
}

export const reportHomeConversion = () => {
  if (typeof window === 'undefined') return
  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.text = `if (typeof window.gtag === 'function') { window.gtag('event', 'conversion', {'send_to': 'AW-11075064387/OpNVCNuN-IgYEMOkgKEp'}); }`
  document.head.appendChild(script)
  script.remove()
}

export const reportPageLoadConversion = (path: string) => {
  pushGtmEvent({
    event: 'page_view',
    page_path: path,
  })
}
