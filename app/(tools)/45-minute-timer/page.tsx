import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('45-minute-timer')

export default function Page() {
  return <SeoLandingPage slug="45-minute-timer" />
}
