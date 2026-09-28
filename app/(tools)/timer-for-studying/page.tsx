import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('timer-for-studying')

export default function Page() {
  return <SeoLandingPage slug="timer-for-studying" />
}
