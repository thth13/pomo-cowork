import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('reading-timer')

export default function Page() {
  return <SeoLandingPage slug="reading-timer" />
}
