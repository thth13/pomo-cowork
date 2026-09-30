import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('act-timer')

export default function Page() {
  return <SeoLandingPage slug="act-timer" />
}
