import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('60-minute-timer')

export default function Page() {
  return <SeoLandingPage slug="60-minute-timer" />
}
