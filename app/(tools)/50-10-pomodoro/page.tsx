import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('50-10-pomodoro')

export default function Page() {
  return <SeoLandingPage slug="50-10-pomodoro" />
}
