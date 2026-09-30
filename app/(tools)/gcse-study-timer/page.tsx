import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('gcse-study-timer')

export default function Page() {
  return <SeoLandingPage slug="gcse-study-timer" />
}
