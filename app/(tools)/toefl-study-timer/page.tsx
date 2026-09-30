import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('toefl-study-timer')

export default function Page() {
  return <SeoLandingPage slug="toefl-study-timer" />
}
