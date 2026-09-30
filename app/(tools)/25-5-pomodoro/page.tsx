import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('25-5-pomodoro')

export default function Page() {
  return <SeoLandingPage slug="25-5-pomodoro" />
}
