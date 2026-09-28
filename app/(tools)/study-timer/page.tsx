import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('study-timer')

export default function Page() {
  return <SeoLandingPage slug="study-timer" />
}
