import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('rain-timer')

export default function Page() {
  return <SeoLandingPage slug="rain-timer" />
}
