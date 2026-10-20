import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('study-stopwatch')

export default function Page() {
  return <SeoLandingPage slug="study-stopwatch" />
}
