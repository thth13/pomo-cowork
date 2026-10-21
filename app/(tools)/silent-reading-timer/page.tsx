import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('silent-reading-timer')

export default function Page() {
  return <SeoLandingPage slug="silent-reading-timer" />
}
