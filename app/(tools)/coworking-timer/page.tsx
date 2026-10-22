import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('coworking-timer')

export default function Page() {
  return <SeoLandingPage slug="coworking-timer" />
}
