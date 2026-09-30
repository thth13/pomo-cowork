import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('gre-study-timer')

export default function Page() {
  return <SeoLandingPage slug="gre-study-timer" />
}
