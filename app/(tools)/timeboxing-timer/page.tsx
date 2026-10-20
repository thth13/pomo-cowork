import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('timeboxing-timer')

export default function Page() {
  return <SeoLandingPage slug="timeboxing-timer" />
}
