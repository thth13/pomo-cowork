import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('study-timer-with-friends')

export default function Page() {
  return <SeoLandingPage slug="study-timer-with-friends" />
}
