import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('cozy-study-timer')

export default function Page() {
  return <SeoLandingPage slug="cozy-study-timer" />
}
