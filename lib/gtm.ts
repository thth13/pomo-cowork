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
  pushGtmEvent({
    event: 'conversion',
    send_to: 'AW-11075064387/OpNVCNuN-IgYEMOkgKEp',
  })
}

export const reportPageLoadConversion = (path: string) => {
  pushGtmEvent({
    event: 'page_view',
    page_path: path,
  })
}
