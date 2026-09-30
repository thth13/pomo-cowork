import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('neet-study-timer')

export default function Page() {
  return <SeoLandingPage slug="neet-study-timer" />
}
