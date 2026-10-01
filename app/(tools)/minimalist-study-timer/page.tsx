import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('minimalist-study-timer')

export default function Page() {
  return <SeoLandingPage slug="minimalist-study-timer" />
}
