import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('50-minute-timer')

export default function Page() {
  return <SeoLandingPage slug="50-minute-timer" />
}
