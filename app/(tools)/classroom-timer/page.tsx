import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('classroom-timer')

export default function Page() {
  return <SeoLandingPage slug="classroom-timer" />
}
