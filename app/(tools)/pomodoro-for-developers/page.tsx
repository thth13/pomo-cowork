import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('pomodoro-for-developers')

export default function Page() {
  return <SeoLandingPage slug="pomodoro-for-developers" />
}
