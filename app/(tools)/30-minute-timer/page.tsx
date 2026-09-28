import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('30-minute-timer')

export default function Page() {
  return <SeoLandingPage slug="30-minute-timer" />
}
