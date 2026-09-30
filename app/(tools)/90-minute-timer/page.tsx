import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('90-minute-timer')

export default function Page() {
  return <SeoLandingPage slug="90-minute-timer" />
}
