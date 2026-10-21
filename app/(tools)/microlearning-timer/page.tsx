import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('microlearning-timer')

export default function Page() {
  return <SeoLandingPage slug="microlearning-timer" />
}
