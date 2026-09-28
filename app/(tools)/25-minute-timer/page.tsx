import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('25-minute-timer')

export default function Page() {
  return <SeoLandingPage slug="25-minute-timer" />
}
