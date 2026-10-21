import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('feynman-technique-timer')

export default function Page() {
  return <SeoLandingPage slug="feynman-technique-timer" />
}
