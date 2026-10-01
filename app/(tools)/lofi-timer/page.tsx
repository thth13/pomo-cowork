import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('lofi-timer')

export default function Page() {
  return <SeoLandingPage slug="lofi-timer" />
}
