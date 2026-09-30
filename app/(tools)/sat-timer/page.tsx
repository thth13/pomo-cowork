import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('sat-timer')

export default function Page() {
  return <SeoLandingPage slug="sat-timer" />
}
