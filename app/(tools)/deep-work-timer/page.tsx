import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('deep-work-timer')

export default function Page() {
  return <SeoLandingPage slug="deep-work-timer" />
}
