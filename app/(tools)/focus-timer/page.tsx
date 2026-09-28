import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('focus-timer')

export default function Page() {
  return <SeoLandingPage slug="focus-timer" />
}
