import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('a-level-study-timer')

export default function Page() {
  return <SeoLandingPage slug="a-level-study-timer" />
}
